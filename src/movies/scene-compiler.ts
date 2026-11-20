import { VOCAB, MovieStyle } from './vocab';
import { CastMemberInput, CoverInput, MovieInput, NARRATOR, SceneInput, parsePlacement } from './movie-format';

/**
 * PLAYBACK FORMAT: what the API serves and public/js/scene-engine.js draws.
 * Every scene is fully explicit, so the browser never has to work out "what was on screen before".
 * Short keys keep the payload small. Never hand-write this format; write the authoring format and let the server compile it.
 *
 *   s  speaker ("N" = narrator, otherwise a cast id)     t   text
 *   p  place    tm time of day    pr props    fx effects
 *   c  characters ("id:x", "id:x>toX", "id:x:pose")      cam camera move    fl flashback (0/1)
 */
export interface PlaybackScene {
  s: string;
  t: string;
  p: string;
  tm: string;
  pr: string[];
  fx: string[];
  c: string[];
  cam: string;
  fl: 0 | 1;
}

export interface PlaybackCover {
  p: string;
  tm: string;
  pr: string[];
  fx: string[];
  c: string[];
  cam: string;
}

export interface CompiledEpisode {
  position: number;
  title: string;
  scenes: PlaybackScene[];
  sceneCount: number;
  minutes: number;
}

export interface CompiledMovie {
  cover: PlaybackCover;
  coverCast: Record<string, CastMemberInput>;
  episodes: CompiledEpisode[];
  totalMinutes: number;
}

const CAMERA_CYCLE = ['in', 'l', 'out', 'r'];
const WORDS_PER_MINUTE = 150;

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
export const minutesFor = (scenes: { t: string }[]) =>
  Math.max(1, Math.round(scenes.reduce((sum, s) => sum + countWords(s.t), 0) / WORDS_PER_MINUTE));

/** Where a character ends up after the scene: a walker finishes at toX. Used so the next scene starts from there. */
function carryPlacement(value: string): string {
  const p = parsePlacement(value);
  if (!p) return value;
  const x = p.toX ?? p.x;
  return `${p.id}:${x}${p.pose ? ':' + p.pose : ''}`;
}

/**
 * Inheritance rules (documented for authors in docs/MOVIE_FORMAT.md):
 *  - place, time, props, fx, characters, flashback: if a scene omits a field it keeps the previous scene's value.
 *  - if the place changes, omitted props, fx and flashback reset to empty.
 *  - characters carry over at the position they walked to.
 *  - camera: if omitted, cycles in, l, out, r by scene number so the picture keeps moving.
 *    In cinema style narration cycles the wide shots and a spoken line cycles medium and close shots on the speaker
 *    (vocabulary.json, cinema.narratorShots and cinema.speakerShots).
 */
function defaultCamera(style: MovieStyle, speaker: string, i: number): string {
  if (style !== 'cinema') return CAMERA_CYCLE[i % CAMERA_CYCLE.length];
  const list = speaker === NARRATOR ? VOCAB.cinema.narratorShots : VOCAB.cinema.speakerShots;
  return list[i % list.length];
}

export function compileScenes(scenes: SceneInput[], style: MovieStyle = 'classic'): PlaybackScene[] {
  let prev = { p: 'room', tm: 'night', pr: [] as string[], fx: [] as string[], c: [] as string[], fl: 0 as 0 | 1 };
  return scenes.map((s, i) => {
    const p = s.place ?? prev.p;
    const tm = s.time ?? prev.tm;
    const moved = p !== prev.p;
    const pr = s.props ?? (moved ? [] : prev.pr);
    const fx = s.fx ?? (moved ? [] : prev.fx);
    const c = s.characters ?? prev.c;
    const fl: 0 | 1 = s.flashback !== undefined ? (s.flashback ? 1 : 0) : moved ? 0 : prev.fl;
    const scene: PlaybackScene = {
      s: s.speaker === NARRATOR ? 'N' : s.speaker,
      t: s.text,
      p,
      tm,
      pr,
      fx,
      c,
      cam: s.camera ?? defaultCamera(style, s.speaker, i),
      fl,
    };
    prev = { p, tm, pr, fx, c: c.map(carryPlacement), fl };
    return scene;
  });
}

export function compileCover(cover: CoverInput, style: MovieStyle = 'classic'): PlaybackCover {
  return {
    p: cover.place,
    tm: cover.time,
    pr: cover.props ?? [],
    fx: cover.fx ?? [],
    c: cover.characters ?? [],
    cam: cover.camera ?? (style === 'cinema' ? 'wide' : 'in'),
  };
}

/** Only the cast members drawn on the cover, so the catalog payload stays small. */
export function pickCoverCast(cast: MovieInput['cast'], cover: PlaybackCover): Record<string, CastMemberInput> {
  const picked: Record<string, CastMemberInput> = {};
  for (const placement of cover.c) {
    const p = parsePlacement(placement);
    if (p && cast[p.id]) picked[p.id] = cast[p.id];
  }
  return picked;
}

export function compileMovie(movie: MovieInput): CompiledMovie {
  const style: MovieStyle = movie.style ?? 'classic';
  const cover = compileCover(movie.cover, style);
  const episodes = movie.episodes.map((ep, position) => {
    const scenes = compileScenes(ep.scenes, style);
    return { position, title: ep.title, scenes, sceneCount: scenes.length, minutes: minutesFor(scenes) };
  });
  return {
    cover,
    coverCast: pickCoverCast(movie.cast, cover),
    episodes,
    totalMinutes: episodes.reduce((sum, e) => sum + e.minutes, 0),
  };
}
