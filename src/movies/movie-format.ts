import { z } from 'zod';
import { VOCAB, vocabFor, MovieStyle } from './vocab';

/**
 * AUTHORING FORMAT (version 1): what a person or an AI writes and what the import endpoint accepts.
 * The full human-readable spec is docs/MOVIE_FORMAT.md. Keep the two in sync.
 * The server compiles this into the PLAYBACK FORMAT (see scene-compiler.ts) before storing it.
 */

export const NARRATOR = 'narrator';
export const SCHEMA_VERSION = 1;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a colour like #aa33cc');
const castId = z.string().regex(/^[a-z][a-z0-9]{0,23}$/, 'cast ids are lowercase letters and digits, e.g. "kemi" or "kemi2"');
const slug = z
  .string()
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase words joined by hyphens, e.g. "magic-base"');

function oneOf(label: string, list: string[]) {
  return z.string().refine((v) => list.includes(v), (v) => ({
    message: `unknown ${label} "${v}". Allowed: ${list.join(', ')}`,
  }));
}

/** "kemi:130", "kemi:80>260" (walks from 80 to 260), "kemi:130:point". x is 0 to 400 across the screen. */
const CHARACTER_PLACEMENT = /^([a-z][a-z0-9]{0,23}):(\d{1,3})(?:>(\d{1,3}))?(?::([a-z]+))?$/;

export function parsePlacement(value: string) {
  const m = CHARACTER_PLACEMENT.exec(value);
  if (!m) return null;
  return { id: m[1], x: Number(m[2]), toX: m[3] === undefined ? null : Number(m[3]), pose: m[4] ?? '' };
}

const placement = z.string().superRefine((value, ctx) => {
  const p = parsePlacement(value);
  if (!p) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `"${value}" is not a valid character placement. Use "id:x", "id:x>toX" or "id:x:pose", e.g. "kemi:130:point"`,
    });
    return;
  }
  if (p.x > 400 || (p.toX !== null && p.toX > 400)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${value}": x must be between 0 and 400` });
  }
  // The pose is checked against the movie's style in MovieSchema.superRefine.
});

const CastMember = z
  .object({
    name: z.string().min(1).max(40),
    role: z.string().max(60).optional(),
    coat: hex,
    coat2: hex.optional(),
    trim: hex.optional(),
    skin: hex.optional(),
    pants: hex.optional(),
    hat: oneOf('hat', VOCAB.hats).optional(),
    hc: hex.optional(),
    hc2: hex.optional(),
    hair: hex.optional(),
    beard: hex.optional(),
    /** Comma separated list from the extras vocabulary, e.g. "pipe" or "cane,parrot". */
    extra: z
      .string()
      .refine((v) => v.split(',').every((x) => VOCAB.extras.includes(x.trim())), {
        message: `extra must be a comma separated list from: ${VOCAB.extras.join(', ')}`,
      })
      .optional(),
    peg: z.boolean().optional(),
    sc: z.number().min(0.5).max(1.5).optional(),
    tag: hex.optional(),
    pitch: z.number().min(0.1).max(2).optional(),
    rate: z.number().min(0.5).max(2).optional(),
    /** Cinema style only: which 3D model plays this character (see cinema.models in vocabulary.json). */
    model: z.string().optional(),
    /** Toon model only: hair style, extras worn (comma list) and body build. */
    hairstyle: z.enum(['short', 'afro', 'long', 'bun', 'bald', 'cap', 'braids', 'cowl']).optional(),
    gear: z.string().regex(/^(mask|glasses|cape|belt|bolt|coat|scarf|headband|suit|visor|halo)(,(mask|glasses|cape|belt|bolt|coat|scarf|headband|suit|visor|halo))*$/, 'gear is a comma list of: mask, glasses, cape, belt, bolt, coat, scarf, headband, suit, visor, halo').optional(),
    build: z.enum(['slim', 'regular', 'stocky']).optional(),
    /** Narration voice id for this character, e.g. "en-NG-EzinneNeural". Narrator lines use the viewer's chosen voice. */
    voice: z.string().regex(/^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/, 'voice looks like "en-GB-RyanNeural"').optional(),
    /** Hidden characters exist only to be drawn (for example a second look); they are not listed in the cast. */
    hidden: z.boolean().optional(),
  })
  .strict();

// Names are checked against the movie's style in MovieSchema.superRefine (classic and cinema have different lists).
const sceneLook = {
  place: z.string().optional(),
  time: z.string().optional(),
  props: z.array(z.string()).max(8).optional(),
  fx: z.array(z.string()).max(6).optional(),
  characters: z.array(placement).max(6).optional(),
  camera: z.string().optional(),
};

const Scene = z
  .object({
    /** "narrator" or a cast id. Whoever speaks is the one whose mouth moves and whose voice pitch is used. */
    speaker: z.string().min(1).max(24),
    text: z.string().min(1).max(600),
    ...sceneLook,
    flashback: z.boolean().optional(),
  })
  .strict();

const Cover = z
  .object({
    place: z.string(),
    time: z.string(),
    props: sceneLook.props,
    fx: sceneLook.fx,
    characters: sceneLook.characters,
    camera: sceneLook.camera,
  })
  .strict();

const Episode = z
  .object({
    title: z.string().min(1).max(80),
    scenes: z.array(Scene).min(1).max(60),
  })
  .strict();

export const MovieSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    slug,
    title: z.string().min(1).max(80),
    synopsis: z.string().min(1).max(600),
    credit: z.string().min(1).max(80),
    /** Display name of the genre row the movie appears in. Shared by exact name, e.g. "Fantasy". */
    genre: z.string().regex(/^[A-Za-z][A-Za-z &-]{1,29}$/, 'genre is 2 to 30 letters, e.g. "Science fiction"'),
    /** "classic" (default) is drawn by the SVG engine. "cinema" is drawn by the Three.js engine with 3D characters. */
    style: z.enum(['classic', 'cinema']).optional(),
    /** Poster image for cinema movies, a file under public/posters/. Made with scripts/render-poster.cjs. */
    poster: z.string().regex(/^\/posters\/[a-z0-9][a-z0-9-]*\.(jpg|png|webp)$/, 'poster is a path like "/posters/my-movie.jpg"').optional(),
    featured: z.boolean().optional(),
    published: z.boolean().optional(),
    cover: Cover,
    cast: z.record(castId, CastMember).refine((c) => Object.keys(c).length >= 1 && Object.keys(c).length <= 12, {
      message: 'cast needs between 1 and 12 members',
    }),
    episodes: z.array(Episode).min(1).max(12),
  })
  .strict()
  .superRefine((movie, ctx) => {
    const castIds = new Set(Object.keys(movie.cast));
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    const style: MovieStyle = movie.style ?? 'classic';
    const names = vocabFor(style);
    const oneOfNames = (label: string, value: string | undefined, list: string[], path: (string | number)[]) => {
      if (value !== undefined && !list.includes(value)) issue(path, `unknown ${label} "${value}". Allowed: ${list.join(', ')}`);
    };
    const checkLook = (look: { place?: string; time?: string; props?: string[]; fx?: string[]; camera?: string }, path: (string | number)[]) => {
      oneOfNames('place', look.place, names.places, [...path, 'place']);
      oneOfNames('time', look.time, names.times, [...path, 'time']);
      oneOfNames('camera', look.camera, names.cameras, [...path, 'camera']);
      (look.props ?? []).forEach((v, i) => oneOfNames('prop', v, names.props, [...path, 'props', i]));
      (look.fx ?? []).forEach((v, i) => oneOfNames('fx', v, names.fx, [...path, 'fx', i]));
    };
    const checkCharacters = (list: string[] | undefined, path: (string | number)[]) => {
      (list ?? []).forEach((value, i) => {
        const p = parsePlacement(value);
        if (!p) return;
        if (!castIds.has(p.id)) issue([...path, i], `"${p.id}" is not in cast. Known ids: ${[...castIds].join(', ')}`);
        if (p.pose && !names.poses.includes(p.pose)) issue([...path, i], `"${value}": unknown pose "${p.pose}". Allowed: ${names.poses.join(', ')}`);
      });
    };

    // Cast: a 3D model is required for cinema movies and meaningless for classic ones.
    for (const [id, member] of Object.entries(movie.cast)) {
      if (style === 'cinema') {
        if (!member.model) issue(['cast', id, 'model'], `cinema movies need a model for every character. Allowed: ${VOCAB.cinema.models.join(', ')}`);
        else if (!VOCAB.cinema.models.includes(member.model)) issue(['cast', id, 'model'], `unknown model "${member.model}". Allowed: ${VOCAB.cinema.models.join(', ')}`);
      } else if (member.model) {
        issue(['cast', id, 'model'], 'model is only used when the movie has style "cinema"');
      }
    }
    if (style !== 'cinema' && movie.poster) issue(['poster'], 'poster is only used when the movie has style "cinema"');

    checkLook(movie.cover, ['cover']);
    checkCharacters(movie.cover.characters, ['cover', 'characters']);

    let totalScenes = 0;
    movie.episodes.forEach((ep, ei) => {
      totalScenes += ep.scenes.length;
      ep.scenes.forEach((scene, si) => {
        const base = ['episodes', ei, 'scenes', si];
        checkLook(scene, base);
        if (scene.speaker !== NARRATOR && !castIds.has(scene.speaker)) {
          issue([...base, 'speaker'], `speaker "${scene.speaker}" must be "${NARRATOR}" or a cast id (${[...castIds].join(', ')})`);
        }
        checkCharacters(scene.characters, [...base, 'characters']);
        if (si === 0 && (!scene.place || !scene.time)) {
          issue(base, 'the first scene of every episode must set both "place" and "time"');
        }
      });
    });
    if (totalScenes > 300) issue(['episodes'], `a movie can have at most 300 scenes in total (found ${totalScenes})`);
  });

export type MovieInput = z.infer<typeof MovieSchema>;
export type CastMemberInput = z.infer<typeof CastMember>;
export type SceneInput = z.infer<typeof Scene>;
export type CoverInput = z.infer<typeof Cover>;

export type ValidationResult = { ok: true; data: MovieInput } | { ok: false; issues: string[] };

/** Validate unknown JSON. Issues are plain strings like `episodes.2.scenes.4.place: unknown place "desert". Allowed: ...` */
export function validateMovie(raw: unknown): ValidationResult {
  const result = MovieSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
  };
}
