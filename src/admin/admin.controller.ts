import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MoviesService } from '../movies/movies.service';
import { ApiKeyGuard } from './api-key.guard';

/**
 * Operator API. Every route needs the `x-api-key` header.
 *
 *   POST   /api/admin/movies               body = a movie file (authoring format). Creates or replaces by slug.
 *   GET    /api/admin/movies               all movies, including drafts
 *   PATCH  /api/admin/movies/:slug/publish body = { "published": true | false }
 *   DELETE /api/admin/movies/:slug
 */
@Controller('api/admin/movies')
@UseGuards(ApiKeyGuard)
export class AdminController {
  constructor(private readonly movies: MoviesService) {}

  @Post()
  @HttpCode(201)
  importMovie(@Body() body: unknown) {
    return this.movies.importMovie(body);
  }

  @Get()
  list() {
    return this.movies.adminList();
  }

  @Patch(':slug/publish')
  publish(@Param('slug') slug: string, @Body() body: { published?: boolean }) {
    return this.movies.setPublished(slug, body?.published !== false);
  }

  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.movies.deleteBySlug(slug);
  }
}
