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

// Cinema style: the 3D engine's lists (public/js/cinema/vocab.js) must match the "cinema" section of the JSON.
const { CINEMA_VOCAB, NARRATOR_SHOTS, SPEAKER_SHOTS } = await import(pathToFileURL(join(root, 'public/js/cinema/vocab.js')).href);
const cinemaEngine = { ...CINEMA_VOCAB, narratorShots: NARRATOR_SHOTS, speakerShots: SPEAKER_SHOTS };
for (const key of Object.keys(cinemaEngine)) {
  const a = JSON.stringify(cinemaEngine[key]);
  const b = JSON.stringify(json.cinema?.[key]);
  // order matters for the shot lists (they are cycled), not for the vocabularies
  const same = key.endsWith('Shots') ? a === b : [...cinemaEngine[key]].sort().join() === [...(json.cinema?.[key] ?? [])].sort().join();
  if (!same) fail(`cinema.${key}: public/js/cinema/vocab.js and vocabulary.json differ\n    engine: ${a}\n    json:   ${b}`);
}
for (const key of Object.keys(json.cinema ?? {})) if (!(key in cinemaEngine)) fail(`cinema.${key} is in vocabulary.json but not in public/js/cinema/vocab.js`);

// Every place and model must actually be built by the engine code.
const setsSource = readFileSync(join(root, 'public/js/cinema/sets.js'), 'utf8');
for (const place of CINEMA_VOCAB.places) if (!new RegExp(`\\b${place}\\b`).test(setsSource.slice(setsSource.indexOf('const PLACES')))) fail(`cinema place "${place}" is not registered in PLACES (public/js/cinema/sets.js)`);
for (const prop of CINEMA_VOCAB.props) if (!setsSource.includes(`${prop}: () =>`)) fail(`cinema prop "${prop}" has no builder in PROP_BUILDERS (public/js/cinema/sets.js)`);
const actorsSource = readFileSync(join(root, 'public/js/cinema/actors.js'), 'utf8');
for (const model of CINEMA_VOCAB.models) if (!new RegExp(`^  ${model}: \\{ (url|bytes)`, 'm').test(actorsSource)) fail(`cinema model "${model}" is not in MODELS (public/js/cinema/actors.js)`);

if (problems) process.exit(1);
console.log(`✓ cinema vocabulary in sync: ${json.cinema.places.length} places, ${json.cinema.models.length} models`);
console.log(`✓ vocabulary in sync: ${json.places.length} places, ${json.props.length} props, ${json.fx.length} effects, ${json.hats.length} hats, ${json.extras.length} extras`);
