/**
 * Import movie files straight into the configured database (no running server needed).
 *   npm run movie:import -- path/to/movie.json [more.json ...]
 * Same slug = the movie is replaced. Uses the same DB settings as the server (.env).
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { readFileSync } from 'fs';

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: npm run movie:import -- <movie.json> [...]');
    process.exit(1);
  }
  process.env.SEED_ON_BOOT = 'false'; // importing by hand must not also load the demo movies

  // Loaded after the env change above so ConfigModule sees it.
  const { AppModule } = await import('../app.module');
  const { MoviesService } = await import('../movies/movies.service');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const movies = app.get(MoviesService);

  let failed = 0;
  for (const file of files) {
    try {
      const r = await movies.importMovie(JSON.parse(readFileSync(file, 'utf8')));
      console.log(`✓ ${r.replaced ? 'updated' : 'created'} "${r.slug}" · ${r.genre} · ${r.episodes} episodes · ${r.scenes} scenes · ~${r.minutes} min`);
    } catch (err: any) {
      failed++;
      console.error(`✗ ${file}`);
      const body = err?.getResponse?.();
      if (body?.issues) body.issues.forEach((i: string) => console.error(`  ${i}`));
      else console.error(`  ${err?.message ?? err}`);
    }
  }
  await app.close();
  process.exit(failed ? 1 : 0);
}

main();
