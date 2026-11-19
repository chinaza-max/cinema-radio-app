import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { SEED_DIR } from '../config/paths';
import { VOCAB } from './vocab';
import { validateMovie } from './movie-format';

const seedFiles = readdirSync(SEED_DIR).filter((f) => f.endsWith('.json'));
const load = (file: string) => JSON.parse(readFileSync(join(SEED_DIR, file), 'utf8'));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe('movie-format', () => {
  it('has seed movies to test', () => {
    expect(seedFiles.length).toBeGreaterThan(0);
  });

  it.each(seedFiles)('accepts seed movie %s', (file) => {
    const result = validateMovie(load(file));
    expect(result.ok ? [] : result.issues).toEqual([]);
  });

  it('accepts the example in docs/example-movie.json (keep it valid, AIs copy it)', () => {
    const raw = JSON.parse(readFileSync(join(SEED_DIR, '..', '..', 'docs', 'example-movie.json'), 'utf8'));
    const result = validateMovie(raw);
    expect(result.ok ? [] : result.issues).toEqual([]);
  });

  const base = () => clone(load('magic-base.json'));

  const issuesFor = (mutate: (m: any) => void) => {
    const m = base();
    mutate(m);
    const r = validateMovie(m);
    return r.ok ? [] : r.issues;
  };

  it('rejects an unknown place and lists the allowed ones', () => {
    const issues = issuesFor((m) => (m.episodes[0].scenes[1].place = 'desert'));
    expect(issues.join('\n')).toMatch(/episodes\.0\.scenes\.1\.place: unknown place "desert"\. Allowed: .*moor/);
  });

  it('rejects a speaker that is not in the cast', () => {
    const issues = issuesFor((m) => (m.episodes[1].scenes[0].speaker = 'nobody'));
    expect(issues.join('\n')).toMatch(/speaker "nobody"/);
  });

  it('rejects a character placement for someone not in the cast', () => {
    const issues = issuesFor((m) => (m.episodes[0].scenes[0].characters = ['ghost:100']));
    expect(issues.join('\n')).toMatch(/"ghost" is not in cast/);
  });

  it('rejects a malformed placement and an out-of-range x', () => {
    expect(issuesFor((m) => (m.episodes[0].scenes[0].characters = ['kemi-130'])).join('\n')).toMatch(/not a valid character placement/);
    expect(issuesFor((m) => (m.episodes[0].scenes[0].characters = ['kemi:900'])).join('\n')).toMatch(/between 0 and 400/);
  });

  it('requires place and time on the first scene of every episode', () => {
    const issues = issuesFor((m) => delete m.episodes[2].scenes[0].place);
    expect(issues.join('\n')).toMatch(/first scene of every episode/);
  });

  it('rejects unknown keys so typos are caught', () => {
    const issues = issuesFor((m) => (m.episodes[0].scenes[0].plaace = 'moor'));
    expect(issues.join('\n')).toMatch(/Unrecognized key/);
  });

  it('rejects a bad slug and a bad colour', () => {
    expect(issuesFor((m) => (m.slug = 'Magic Base')).join('\n')).toMatch(/slug/);
    expect(issuesFor((m) => (m.cast.kemi.coat = 'green')).join('\n')).toMatch(/colour/);
  });

  it('documents every vocabulary name in docs/MOVIE_FORMAT.md (keep the doc complete, AIs rely on it)', () => {
    const doc = readFileSync(join(SEED_DIR, '..', '..', 'docs', 'MOVIE_FORMAT.md'), 'utf8');
    const missing: string[] = [];
    for (const key of ['places', 'times', 'props', 'fx', 'poses', 'cameras', 'hats', 'extras'] as const) {
      for (const name of VOCAB[key]) if (!doc.includes('`' + name + '`')) missing.push(`${key}: ${name}`);
    }
    expect(missing).toEqual([]);
  });
});
