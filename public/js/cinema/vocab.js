/*
 * The names a "cinema" style movie may use. This file has no imports so it also runs under plain Node:
 * `npm run check:vocab` compares it with src/movies/vocabulary.json (section "cinema").
 */
export const CINEMA_VOCAB = {
  places: ['bridge', 'corridor', 'engine', 'planet', 'space', 'ruins'],
  times: ['day', 'dusk', 'night', 'alert', 'dim'],
  props: ['hologram', 'monolith', 'beacon', 'pod', 'crates', 'gate'],
  fx: ['dust', 'sparks', 'alarm', 'glitch', 'streaks', 'haze'],
  poses: ['run', 'sneak', 'nod', 'shake', 'sad', 'point', 'wave', 'fall'],
  cameras: ['wide', 'medium', 'close', 'low', 'high', 'orbit', 'in', 'out', 'l', 'r'],
  models: ['soldier', 'michelle', 'avatar', 'android', 'robot', 'hologram'],
};

/** Shots used when a scene does not choose one: narration is wide, dialogue alternates medium and close. */
export const NARRATOR_SHOTS = ['wide', 'orbit', 'high', 'wide', 'out'];
export const SPEAKER_SHOTS = ['medium', 'close', 'medium', 'low', 'close'];
