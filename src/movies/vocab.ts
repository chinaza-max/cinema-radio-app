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
  /** Names for movies with `style: "cinema"` (the Three.js engine in public/js/cinema/). */
  cinema: {
    places: string[];
    times: string[];
    props: string[];
    fx: string[];
    poses: string[];
    cameras: string[];
    models: string[];
    /** Camera moves used when a scene does not choose one: narration cycles the first list, dialogue the second. */
    narratorShots: string[];
    speakerShots: string[];
  };
};

export type MovieStyle = 'classic' | 'cinema';

/** The names a movie of the given style may use. */
export function vocabFor(style: MovieStyle) {
  if (style === 'cinema') {
    const c = VOCAB.cinema;
    return { places: c.places, times: c.times, props: c.props, fx: c.fx, poses: c.poses, cameras: c.cameras };
  }
  return { places: VOCAB.places, times: VOCAB.times, props: VOCAB.props, fx: VOCAB.fx, poses: VOCAB.poses, cameras: VOCAB.cameras };
}
