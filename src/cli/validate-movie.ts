/**
 * Check movie files without touching the database.
 *   npm run movie:validate -- path/to/movie.json [more.json ...]
 * Exit code 1 if any file is invalid. Prints every problem with its path inside the file.
 */
import { readFileSync } from 'fs';
import { validateMovie } from '../movies/movie-format';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: npm run movie:validate -- <movie.json> [...]');
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`✗ ${file}\n  not valid JSON: ${(err as Error).message}`);
    failed++;
    continue;
  }
  const result = validateMovie(raw);
  if (result.ok) {
    const scenes = result.data.episodes.reduce((n, e) => n + e.scenes.length, 0);
    console.log(`✓ ${file}  "${result.data.title}" · ${result.data.genre} · ${result.data.episodes.length} episodes · ${scenes} scenes`);
  } else {
    failed++;
    console.error(`✗ ${file}`);
    result.issues.forEach((i) => console.error(`  ${i}`));
  }
}
process.exit(failed ? 1 : 0);
