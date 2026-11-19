import { Controller, Get, Header, Param, ParseIntPipe } from '@nestjs/common';
import { GenresService } from '../genres/genres.service';
import { MoviesService } from './movies.service';
import { VOCAB } from './vocab';

/** Public, read-only API. Responses are pre-serialised JSON strings from an in-memory cache. */
const CACHE = 'public, max-age=30, stale-while-revalidate=300';
const JSON_TYPE = 'application/json; charset=utf-8';

@Controller('api')
export class MoviesController {
  constructor(
    private readonly movies: MoviesService,
    private readonly genres: GenresService,
  ) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  /** Movies grouped by genre, plus the featured movie. Same data that is embedded in the home page. */
  @Get('catalog')
  @Header('Content-Type', JSON_TYPE)
  @Header('Cache-Control', CACHE)
  async catalog() {
    return (await this.movies.getSnapshot()).json;
  }

  @Get('genres')
  async listGenres() {
    return (await this.genres.list()).map((g) => ({ slug: g.slug, name: g.name }));
  }

  /** Everything a movie file may use. Give this to an AI that writes movie files. */
  @Get('vocabulary')
  @Header('Cache-Control', CACHE)
  vocabulary() {
    return VOCAB;
  }

  @Get('movies/:slug')
  @Header('Content-Type', JSON_TYPE)
  @Header('Cache-Control', CACHE)
  movie(@Param('slug') slug: string) {
    return this.movies.movieJson(slug);
  }

  /** Episode numbers are 1-based. */
  @Get('movies/:slug/episodes/:n')
  @Header('Content-Type', JSON_TYPE)
  @Header('Cache-Control', CACHE)
  episode(@Param('slug') slug: string, @Param('n', ParseIntPipe) n: number) {
    return this.movies.episodeJson(slug, n);
  }
}
