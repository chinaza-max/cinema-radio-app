import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GenresService } from '../genres/genres.service';
import { SCHEMA_VERSION, validateMovie } from './movie-format';
import type { CastMemberInput } from './movie-format';
import { Movie } from './movie.schema';
import { compileMovie, PlaybackCover } from './scene-compiler';

export interface GenreLabel {
  slug: string;
  name: string;
}

/** The light version of a movie used on the home page. No scenes, no full cast. */
export interface MovieSummary {
  slug: string;
  title: string;
  genre: GenreLabel;
  episodeCount: number;
  totalMinutes: number;
  cover: PlaybackCover;
  coverCast: Record<string, CastMemberInput>;
  /** 'cinema' movies are drawn in 3D and show `poster` (an image) instead of the SVG cover. */
  style: 'classic' | 'cinema';
  poster: string;
}

export interface Catalog {
  featured: (MovieSummary & { synopsis: string; credit: string }) | null;
  genres: (GenreLabel & { movies: MovieSummary[] })[];
}

/** The catalog plus its JSON text, built once and reused until a movie changes. */
export interface CatalogSnapshot {
  catalog: Catalog;
  json: string;
}

/** Fields read for the home page. Leaves out `cast` and `episodes` (and so every scene). */
const CATALOG_FIELDS = {
  slug: 1,
  title: 1,
  synopsis: 1,
  credit: 1,
  genre: 1,
  featured: 1,
  episodeCount: 1,
  totalMinutes: 1,
  cover: 1,
  coverCast: 1,
  style: 1,
  poster: 1,
  updatedAt: 1,
};

const MAX_CACHED_JSON = 500;

@Injectable()
export class MoviesService {
  private snapshotPromise?: Promise<CatalogSnapshot>;
  private readonly jsonCache = new Map<string, string>();

  constructor(
    @InjectModel(Movie.name) private readonly movies: Model<Movie>,
    private readonly genres: GenresService,
  ) {}

  // ---------------------------------------------------------------- write side

  /** Validate, compile and save a movie file. Same slug = replace. Throws 400 with a list of issues if invalid. */
  async importMovie(raw: unknown) {
    const parsed = validateMovie(raw);
    if (!parsed.ok) {
      throw new BadRequestException({ message: 'Movie file is invalid', issues: parsed.issues });
    }
    const input = parsed.data;
    const compiled = compileMovie(input);
    const genre = await this.genres.ensure(input.genre);

    // One atomic write replaces the whole movie, episodes included. `returnDocument: 'before'` gives
    // the previous document (null on first import), which tells us whether this was a replacement.
    const previous = await this.movies
      .findOneAndUpdate(
        { slug: input.slug },
        {
          $set: {
            title: input.title,
            synopsis: input.synopsis,
            credit: input.credit,
            genre: { slug: genre.slug, name: genre.name },
            featured: input.featured ?? false,
            published: input.published ?? true,
            style: input.style ?? 'classic',
            poster: input.poster ?? '',
            cover: compiled.cover,
            coverCast: compiled.coverCast,
            cast: input.cast,
            episodeCount: compiled.episodes.length,
            totalMinutes: compiled.totalMinutes,
            schemaVersion: SCHEMA_VERSION,
            episodes: compiled.episodes,
          },
        },
        { upsert: true, returnDocument: 'before', projection: { _id: 1 } },
      )
      .lean();

    this.invalidate();
    return {
      slug: input.slug,
      title: input.title,
      genre: genre.name,
      episodes: compiled.episodes.length,
      scenes: compiled.episodes.reduce((n, e) => n + e.sceneCount, 0),
      minutes: compiled.totalMinutes,
      published: input.published ?? true,
      replaced: previous !== null,
    };
  }

  async deleteBySlug(slug: string) {
    const res = await this.movies.deleteOne({ slug });
    if (res.deletedCount === 0) throw new NotFoundException(`No movie with slug "${slug}"`);
    this.invalidate();
    return { slug, deleted: true };
  }

  async setPublished(slug: string, published: boolean) {
    const res = await this.movies.updateOne({ slug }, { $set: { published } });
    if (res.matchedCount === 0) throw new NotFoundException(`No movie with slug "${slug}"`);
    this.invalidate();
    return { slug, published };
  }

  async hasSlug(slug: unknown): Promise<boolean> {
    return typeof slug === 'string' && (await this.movies.exists({ slug })) !== null;
  }

  countAll(): Promise<number> {
    return this.movies.countDocuments();
  }

  // ----------------------------------------------------------------- read side

  /** Everything including drafts. For the admin API only. */
  async adminList() {
    const rows = await this.movies
      .find({}, { slug: 1, title: 1, genre: 1, published: 1, featured: 1, episodeCount: 1, totalMinutes: 1, updatedAt: 1, _id: 0 })
      .sort({ updatedAt: -1 })
      .lean();
    return rows.map((m) => ({
      slug: m.slug,
      title: m.title,
      genre: m.genre.name,
      published: m.published,
      featured: m.featured,
      episodes: m.episodeCount,
      minutes: m.totalMinutes,
      updatedAt: m.updatedAt,
    }));
  }

  getSnapshot(): Promise<CatalogSnapshot> {
    this.snapshotPromise ??= this.buildSnapshot().catch((err) => {
      this.snapshotPromise = undefined; // do not cache failures
      throw err;
    });
    return this.snapshotPromise;
  }

  /** Movie page data: cast, cover and an episode list WITHOUT scenes. Returned as a ready-made JSON string. */
  movieJson(slug: string): Promise<string> {
    return this.cached(`movie:${slug}`, async () => {
      // Exclusion projection on a nested array field: every episode comes back without its scenes.
      const movie = await this.movies.findOne({ slug, published: true }, { 'episodes.scenes': 0 }).lean();
      if (!movie) throw new NotFoundException(`No movie with slug "${slug}"`);
      return {
        slug: movie.slug,
        title: movie.title,
        synopsis: movie.synopsis,
        credit: movie.credit,
        genre: { slug: movie.genre.slug, name: movie.genre.name },
        totalMinutes: movie.totalMinutes,
        style: movie.style ?? 'classic',
        poster: movie.poster ?? '',
        cover: movie.cover,
        cast: movie.cast,
        episodes: [...movie.episodes]
          .sort((a, b) => a.position - b.position)
          .map((e) => ({ n: e.position + 1, title: e.title, sceneCount: e.sceneCount, minutes: e.minutes })),
      };
    });
  }

  /** One episode with all its scenes. `n` is 1-based. */
  episodeJson(slug: string, n: number): Promise<string> {
    return this.cached(`episode:${slug}:${n}`, async () => {
      // $slice returns just the one embedded episode, so the other episodes' scenes never leave the database.
      const movie = await this.movies
        .findOne({ slug, published: true }, { episodes: { $slice: [Math.max(0, n - 1), 1] } })
        .lean();
      if (!movie) throw new NotFoundException(`No movie with slug "${slug}"`);
      const ep = movie.episodes?.[0];
      if (!ep || ep.position !== n - 1) throw new NotFoundException(`Movie "${slug}" has no episode ${n}`);
      return { n, title: ep.title, scenes: ep.scenes };
    });
  }

  // ------------------------------------------------------------------- helpers

  private invalidate() {
    this.snapshotPromise = undefined;
    this.jsonCache.clear();
  }

  private async cached(key: string, load: () => Promise<unknown>): Promise<string> {
    const hit = this.jsonCache.get(key);
    if (hit) return hit;
    const json = JSON.stringify(await load());
    if (this.jsonCache.size >= MAX_CACHED_JSON) this.jsonCache.clear();
    this.jsonCache.set(key, json);
    return json;
  }

  private async buildSnapshot(): Promise<CatalogSnapshot> {
    const [genreRows, rows] = await Promise.all([
      this.genres.list(),
      this.movies.find({ published: true }, CATALOG_FIELDS).sort({ updatedAt: -1, _id: -1 }).lean(),
    ]);

    const summarize = (m: (typeof rows)[number]): MovieSummary => ({
      slug: m.slug,
      title: m.title,
      genre: { slug: m.genre.slug, name: m.genre.name },
      episodeCount: m.episodeCount,
      totalMinutes: m.totalMinutes,
      cover: m.cover,
      coverCast: m.coverCast ?? {},
      style: m.style ?? 'classic',
      poster: m.poster ?? '',
    });

    const bySlug = new Map<string, MovieSummary[]>();
    for (const m of rows) {
      const list = bySlug.get(m.genre.slug) ?? [];
      list.push(summarize(m));
      bySlug.set(m.genre.slug, list);
    }

    // Genre order comes from the genres collection (sortOrder, then name). Genres with no published movie are skipped.
    const genres = genreRows
      .filter((g) => bySlug.has(g.slug))
      .map((g) => ({ slug: g.slug, name: g.name, movies: bySlug.get(g.slug)! }));

    const hero = rows.find((m) => m.featured) ?? rows[0];
    const catalog: Catalog = {
      featured: hero ? { ...summarize(hero), synopsis: hero.synopsis, credit: hero.credit } : null,
      genres,
    };
    return { catalog, json: JSON.stringify(catalog) };
  }
}
