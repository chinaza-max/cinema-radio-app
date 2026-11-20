import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { SEED_DIR } from '../config/paths';
import { MoviesService } from '../movies/movies.service';

/**
 * On startup, if the database has no movies, import every file in seed/movies/.
 * On by default in development, off in production. Control with SEED_ON_BOOT=true|false.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly log = new Logger(SeedService.name);

  constructor(
    private readonly movies: MoviesService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const isProd = this.config.get('NODE_ENV') === 'production';
    const enabled = this.config.get<string>('SEED_ON_BOOT', isProd ? 'false' : 'true') === 'true';
    if (!enabled || !existsSync(SEED_DIR)) return;

    const files = readdirSync(SEED_DIR).filter((f) => f.endsWith('.json')).sort();
    for (const file of files) {
      try {
        const raw = JSON.parse(readFileSync(join(SEED_DIR, file), 'utf8'));
        // Add-only: a seed movie that is already in the database is left alone, so edits and imports survive.
        if (await this.movies.hasSlug(raw?.slug)) continue;
        const result = await this.movies.importMovie(raw);
        this.log.log(`Seeded "${result.slug}" (${result.episodes} episodes)`);
      } catch (err) {
        this.log.error(`Could not seed ${file}: ${JSON.stringify((err as any)?.getResponse?.() ?? String(err))}`);
      }
    }
  }
}
