/*
 * Fails if the scene engine and src/movies/vocabulary.json disagree.
 *   npm run check:vocab
 * Run it after adding a place, prop, hat, extra, effect or time of day to public/js/scene-engine.js.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { VOCAB } = await import(pathToFileURL(join(root, 'public/js/scene-engine.js')).href);
const json = JSON.parse(readFileSync(join(root, 'src/movies/vocabulary.json'), 'utf8'));
const source = readFileSync(join(root, 'public/js/scene-engine.js'), 'utf8');

let problems = 0;
const fail = (msg) => { console.error('✗ ' + msg); problems++; };

for (const key of ['places', 'times', 'props', 'fx', 'poses', 'cameras', 'hats', 'extras']) {
  const a = [...(VOCAB[key] ?? [])].sort().join(',');
  const b = [...(json[key] ?? [])].sort().join(',');
  if (a !== b) {
    const inEngine = VOCAB[key].filter((x) => !json[key].includes(x));
    const inJson = json[key].filter((x) => !VOCAB[key].includes(x));
    fail(`${key}: engine and vocabulary.json differ` + (inEngine.length ? `\n    only in engine: ${inEngine.join(', ')}` : '') + (inJson.length ? `\n    only in vocabulary.json: ${inJson.join(', ')}` : ''));
  }
}

// The fx list is written by hand in the engine, so also check it against the effects the code actually checks for.
const used = new Set([...source.matchAll(/f\.includes\('([a-z]+)'\)/g)].map((m) => m[1]));
for (const name of used) if (!VOCAB.fx.includes(name)) fail(`fx "${name}" is drawn by the engine but missing from VOCAB.fx`);
for (const name of VOCAB.fx) if (!used.has(name)) fail(`fx "${name}" is listed in VOCAB.fx but the engine never draws it`);

if (problems) process.exit(1);
console.log(`✓ vocabulary in sync: ${json.places.length} places, ${json.props.length} props, ${json.fx.length} effects, ${json.hats.length} hats, ${json.extras.length} extras`);
