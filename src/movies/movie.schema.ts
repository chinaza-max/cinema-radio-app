import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { CastMemberInput } from './movie-format';
import type { PlaybackCover, PlaybackScene } from './scene-compiler';

/**
 * Mongoose schemas (the stored shape). Not to be confused with movie-format.ts, which validates the
 * movie FILE that people and AIs write. The server compiles that file into this shape on import.
 *
 * One document per movie, with its episodes embedded. A whole movie is replaced in a single atomic
 * write, so no transactions (and no replica set) are needed. Scenes are the heavy part, so list queries
 * use projections that leave `episodes.scenes` out, and a single episode is read with $slice.
 * Documents stay far below MongoDB's 16 MB limit (a 300-scene movie is roughly 100 KB).
 */

@Schema({ _id: false })
export class EpisodeDoc {
  /** 0-based order inside the movie. The public API uses 1-based episode numbers. */
  @Prop({ required: true })
  position: number;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  sceneCount: number;

  @Prop({ required: true })
  minutes: number;

  /** Playback-format scenes (see scene-compiler.ts). Stored as-is. */
  @Prop({ type: [Object], default: [] })
  scenes: PlaybackScene[];
}
export const EpisodeSchema = SchemaFactory.createForClass(EpisodeDoc);

// minimize:false keeps empty objects such as coverCast: {} instead of dropping them.
@Schema({ collection: 'movies', timestamps: true, minimize: false })
export class Movie {
  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  synopsis: string;

  @Prop({ required: true })
  credit: string;

  /** Copy of the genre's slug and name, so a movie can be shown without a second lookup. */
  @Prop(raw({ slug: { type: String, required: true }, name: { type: String, required: true } }))
  genre: { slug: string; name: string };

  /** The home page hero shows the most recently updated featured movie. */
  @Prop({ default: false })
  featured: boolean;

  /** Drafts (false) are hidden from the public API and pages. */
  @Prop({ default: true })
  published: boolean;

  /** 'classic' = SVG engine, 'cinema' = Three.js engine (see docs/MOVIE_FORMAT.md). */
  @Prop({ default: 'classic', enum: ['classic', 'cinema'] })
  style: 'classic' | 'cinema';

  /** Poster image path for cinema movies, e.g. /posters/signal-from-halcyon.jpg. Empty for classic movies. */
  @Prop({ default: '' })
  poster: string;

  /** Playback-format cover scene, drawn as the poster. */
  @Prop({ type: Object, required: true })
  cover: PlaybackCover;

  /** Only the cast members who appear on the cover (keeps the catalog small). */
  @Prop({ type: Object, default: {} })
  coverCast: Record<string, CastMemberInput>;

  @Prop({ type: Object, required: true })
  cast: Record<string, CastMemberInput>;

  @Prop({ default: 0 })
  episodeCount: number;

  @Prop({ default: 0 })
  totalMinutes: number;

  @Prop({ default: 1 })
  schemaVersion: number;

  @Prop({ type: [EpisodeSchema], default: [] })
  episodes: EpisodeDoc[];

  // Maintained by `timestamps: true`.
  createdAt?: Date;
  updatedAt?: Date;
}

export type MovieDocument = HydratedDocument<Movie>;
export const MovieSchema = SchemaFactory.createForClass(Movie);

// Home page: published movies grouped by genre.
MovieSchema.index({ published: 1, 'genre.slug': 1 });
