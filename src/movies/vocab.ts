import vocabulary from './vocabulary.json';

/**
 * The names the scene engine (public/js/scene-engine.js) knows how to draw.
 * The JSON file is the single list. `npm run check:vocab` fails if the engine and this file disagree.
 */
export const VOCAB = vocabulary as {
  schemaVersion: number;
  places: string[];
  times: string[];
  props: string[];
  fx: string[];
  poses: string[];
  cameras: string[];
  hats: string[];
  extras: string[];
};
