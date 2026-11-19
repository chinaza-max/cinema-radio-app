import { join } from 'path';

/** Project root. Works from both src/ (ts-node) and dist/ (compiled), because both sit one level below the root. */
export const ROOT_DIR = join(__dirname, '..', '..');
export const PUBLIC_DIR = join(ROOT_DIR, 'public');
export const VIEWS_DIR = join(ROOT_DIR, 'views');
export const SEED_DIR = join(ROOT_DIR, 'seed', 'movies');
