# Movie file format (version 1)

A movie is **one JSON file**. This page is the full spec, written for people and for AI models that create movies. The code that enforces it is `src/movies/movie-format.ts`; the rules for filling in omitted fields are in `src/movies/scene-compiler.ts`. A complete small example is [example-movie.json](example-movie.json).

Check a file: `npm run movie:validate -- my-movie.json`. Import it: `npm run movie:import -- my-movie.json`.

---

## Prompt for an AI that creates a movie

Paste this, then add your story idea. Attach this file and `example-movie.json`.

> You write movie files for Cinebox, an app that narrates a story aloud while an animated picture changes with each line. Follow `MOVIE_FORMAT.md` exactly and return **only one JSON file**, no commentary.
>
> Story: *(your idea here: who, where, what happens, how it ends)*
> Length: *(for example 5 episodes of 7 to 9 scenes each)*  Genre: *(one genre name, for example "Fantasy")*
>
> Rules: use only values from the vocabulary lists. Start every episode with a scene that sets `place` and `time`. Put the speaking character in that scene's `characters`, or their mouth will not move. Give each episode a cliffhanger or a clear step forward, and give the movie a real ending. Keep each scene to one picture and one to three sentences (20 to 60 words). Vary the camera. Use `GET /api/vocabulary` if you can reach the running server; otherwise use the lists below.

If the server rejects the file, send the error lines back to the AI. Each one names the exact scene and field.

---

## Structure

```jsonc
{
  "schemaVersion": 1,
  "slug": "magic-base",              // URL name: lowercase words joined by hyphens, max 60. Re-importing the same slug replaces the movie.
  "title": "Magic Base",             // max 80
  "synopsis": "…",                   // 1 to 3 sentences shown on the movie page and home hero, max 600
  "credit": "An original story",     // shown under the title, for example "After Arthur Conan Doyle, 1902"
  "genre": "Fantasy",                // one genre name, 2 to 30 letters. Movies with the same genre share a row on the home page.
  "featured": true,                  // optional. The newest featured movie is the home page hero.
  "published": true,                 // optional, default true. false = draft, hidden from viewers.
  "cover":  { … },                   // the poster picture (see Cover)
  "cast":   { "kemi": { … } },       // 1 to 12 characters, keyed by id (see Cast)
  "episodes": [ { "title": "…", "scenes": [ … ] } ]   // 1 to 12 episodes, 1 to 60 scenes each, 300 scenes in total at most
}
```

Unknown keys are rejected, so a typo such as `"plaace"` is reported instead of silently ignored.

### Scene

One scene = one picture + one spoken line.

```jsonc
{
  "speaker": "kemi",                 // "narrator" or a cast id. Required.
  "text": "Look, Baba Oru!",         // what is spoken and shown as caption. 1 to 600 characters. Required.
  "place": "moor",                   // optional after the first scene of an episode (see Inheritance)
  "time": "dawn",
  "props": ["base", "village"],      // up to 8
  "fx": ["birds"],                   // up to 6 effects
  "characters": ["kemi:130:point", "baba:260"],   // up to 6, see Characters
  "camera": "in",                    // in | out | l | r
  "flashback": true                  // optional: sepia tint
}
```

### Cover

The poster and the movie page header. Same picture fields as a scene, no speaker or text. `place` and `time` are required.

```json
{ "place": "moor", "time": "dawn", "props": ["base", "village"], "fx": ["birds"], "characters": ["kemi:150"], "camera": "in" }
```

### Cast

```jsonc
"kemi": {
  "name": "Kemi",                    // required
  "role": "Apprentice mender",       // shown on the movie page
  "coat": "#2f8f7a",                 // required. Body colour. All colours are #rrggbb.
  "trim": "#f2c14e",                 // stripe down the front
  "coat2": "#1f6f5a",                // sleeves, if different from coat
  "skin": "#8a5a3c",                 // default is light
  "pants": "#222222",
  "hat": "headwrap",                 // from the Hats list
  "hc": "#f2a541",                   // hat colour (also the hair colour for hats "hair" and "hairlong")
  "hc2": "#e0b24a",                  // hat trim or horn colour
  "hair": "#1e130e",                 // hair showing at the side of the head
  "beard": "#ececec",
  "extra": "lightstaff",             // held item or accessory, from the Extras list. Comma separated for several: "cane,parrot"
  "peg": true,                       // wooden leg
  "sc": 0.92,                        // size, 0.5 to 1.5. Children about 0.85, tall villains about 1.1.
  "pitch": 1.18,                     // narration voice, 0.1 to 2. Deep voice 0.6 to 0.8, child 1.2 to 1.3.
  "rate": 1,                         // speaking speed, 0.5 to 2 (1 is normal)
  "tag": "#c04a8a",                  // colour of the speaker dot in the caption (default: coat)
  "hidden": true                     // draw-only look, not listed on the movie page
}
```

A character who changes look (new staff, new costume) can be a second cast entry such as `kemi2` with `"hidden": true`. The speaker for the line is still `kemi2` or `kemi`; both use the name shown in the caption.

Cast ids are lowercase letters and digits, starting with a letter, up to 24 characters: `kemi`, `kemi2`, `lordvexar`. No hyphens or underscores.

### Characters in a scene

Each entry is a short string: `id:x`, optionally `>toX` and `:pose`.

| Form | Meaning |
| --- | --- |
| `kemi:130` | Kemi stands at x = 130 |
| `kemi:80>260` | Kemi walks from x = 80 to x = 260 during the scene |
| `kemi:130:point` | Kemi stands at 130 with an arm raised |
| `kemi:80>260:run` | Walks and bobs like running across the screen |
| `kemi:130:wave` | Waves an arm in greeting |
| `kemi:130:cheer` | Jumps up with arms raised cheering |
| `kemi:130:think` | Tilts head thoughtfully |
| `kemi:130:laugh` | Chuckles and laughs |
| `kemi:130:angry` | Stomps with indignation |
| `kemi:130:bow` | Bows forward |

- **x runs from 0 (left) to 400 (right).** Good spots: left 80 to 130, centre 200, right 270 to 330. Keep two characters at least 60 apart.
- Characters face the middle of the screen. A walker faces the way they walk.
- **Motion across the screen:** Use `id:x1>x2` (e.g. `jay:100>260:walk` or `musa:80>320:run`) to animate characters physically walking or running across the set during a scene.
- **Gestures and Poses:** `point`, `wave`, `cheer`, `think`, `laugh`, `angry`, `bow`, `shock`, `crouch`, `run`, `walk`. Walking is automatic when `>` is used.
- **A speaker's mouth moves only if the speaker is listed in that scene's `characters`.** Narrator lines need no one on screen.
- The list **replaces** the previous scene's characters. To keep someone on screen, list them again, or omit `characters` to keep the whole previous group (see below).

---

## Inheritance: what you can leave out

To keep files short, a scene only states what changes. The compiler fills in the rest, so the browser always receives complete scenes.

| Field | If omitted |
| --- | --- |
| `place`, `time` | Same as the previous scene. **Required on the first scene of every episode.** |
| `props`, `fx` | Same as previous, **unless the place changed**, then they become empty |
| `characters` | Same people as previous, standing where the previous scene left them (a walker stays at the end point) |
| `flashback` | Same as previous, unless the place changed (then off) |
| `camera` | Cycles in, l, out, r by scene number so the picture keeps moving |

To clear something, give an empty array: `"props": []`, `"characters": []`.

---

## Vocabulary

Only these names work. The authoritative list is `src/movies/vocabulary.json` (also served at `GET /api/vocabulary`). New names are added in code: see "Extending the vocabulary" in the README.

**Places** (`place`)

| Name | Looks like |
| --- | --- |
| `room` | Indoor room with wooden walls and floor |
| `hall` | Dark palace hall with pillars and starry arched windows |
| `moor` | Open hills and heather outdoors |
| `forest` | Trees and undergrowth |
| `sea` | Open water with moving waves |
| `island` | Beach, sea and a green island hill |
| `cave` | Rock cave, stalactites, dark |
| `citadel` | Dark fortress under a red storm sky |
| `future` | Far-future garden: pastel sky, slim towers, glowing flowers |
| `warp` | Spinning time tunnel |
| `village` | Outdoor village with huts, path and distant trees |

**Times** (`time`): `day`, `dawn`, `dusk`, `night`, `storm`, `future` (pink sci-fi sky). Outdoor `night` scenes get stars automatically.

**Props** (`props`, up to 8 per scene)

| Name | Draws |
| --- | --- |
| `fire` | Fireplace with flames and warm light (rooms) |
| `window` | Window with curtains showing the sky (rooms) |
| `shelves` | Bookshelf (rooms) |
| `portrait` | Framed portrait on the wall (rooms) |
| `table` | Table with a candle (rooms) |
| `door` | Wooden door (rooms) |
| `torch` | Wall torch with flame and glow (caves, halls) |
| `barrels` | Two barrels |
| `chest` | Open treasure chest with gold |
| `runes` | Glowing circle on the floor |
| `eyes` | Glowing eyes in the dark |
| `beam` | Column of golden light |
| `base` | Floating castle of light (lit) |
| `basedim` | The same castle, dark |
| `crystal` | Glowing crystal |
| `crystaldim` | Cracked, dull crystal |
| `crystals` | Cluster of cave crystals |
| `crown` | Glowing crown on a plinth |
| `orb` | Glowing orb |
| `tower` | Dark tower with a red eye |
| `village` | Three small huts (windows light up at night) |
| `manor` | Distant manor house on a hill |
| `hound` | Small black hound with glowing eyes in the distance |
| `houndbig` | Large hound racing across the foreground |
| `stranger` | Dark figure standing far away |
| `sphinx` | White sphinx statue |
| `machine` | Brass time machine |
| `ship` | Ship deck with mast and sail (use with `place: sea`) |
| `shipfar` | Small ship on the horizon |
| `palms` | Two palm trees |
| `flag` | Small black pirate flag |

**Effects** (`fx`, up to 6): `birds`, `burst` (expanding rings of light), `candles` (many small lights along the bottom), `embers` (rising sparks), `flash` (lightning), `fog`, `glitter`, `gloom` (purple mist), `magic` (rising coloured sparkles), `rain`, `shadow` (dark clouds along the top), `stars`.

**Poses**: `crouch`, `shock`, `run`, `point`, `walk`, `wave`, `cheer`, `think`, `laugh`, `angry`, `bow`. **Cameras**: `in` (slow zoom in), `out` (zoom out), `l` (pan left), `r` (pan right).

**Hats** (`hat`): `headwrap`, `horned`, `wizard`, `deerstalker`, `bowler`, `top`, `tricorn`, `cap`, `straw`, `bandana`, `hood`, `hair`, `hairlong`.

**Extras** (`extra`): `lightstaff` (glowing staff), `staff`, `darkstaff`, `spark` (glowing hand), `bow`, `pipe`, `cane`, `lantern`, `net`, `parrot`.

If a story needs something that is not listed (a desert, a city street, a spaceship), choose the closest listed option and say so, or ask a developer to add it.

---

---

## Cinema style (3D, sci-fi)

Set `"style": "cinema"` at the top level to play the movie in the Three.js engine (`public/js/cinema/`) instead of the flat SVG scenes. Real rigged characters walk, gesture and talk in lit 3D sets with bloom and camera shots. `"style"` defaults to `"classic"`; a movie is one style or the other.

Extra top-level field: `"poster": "/posters/<slug>.jpg"`, the cover image shown on the home page (cinema only). Make it with `NODE_PATH=$(npm root -g) node scripts/render-poster.cjs seed/movies/<slug>.json` while the server runs.

Cast changes for cinema: `model` is **required** (and forbidden in classic movies); `voice` is optional (an Edge neural voice such as `en-GB-RyanNeural`); `coat` tints the outfit; `pitch`/`rate` still apply. Hats, extras and the classic look fields are ignored.

Scenes use the same fields as classic (`place`, `time`, `props`, `fx`, `characters`, `camera`, poses) with the cinema lists below. Character positions `id:x` run 0 to 400 across the set. If `camera` is omitted, narration cycles `wide, orbit, high, wide, out` and speakers cycle `medium, close, medium, low, close`.

**Models** (`model`): `soldier`, `michelle`, `avatar`, `android`, `robot`, `hologram`
- `soldier` armoured human, `michelle` woman in yellow trousers, `avatar` man in a suit (mouth moves), `android` silver android, `robot` small yellow robot, `hologram` a glowing face (mouth moves; good for a ship AI).

**Places**: `bridge`, `corridor`, `engine`, `planet`, `space`, `ruins`

**Times**: `day`, `dusk`, `night`, `alert`, `dim`

**Props**: `hologram`, `monolith`, `beacon`, `pod`, `crates`, `gate`

**Effects** (`fx`): `dust`, `sparks`, `alarm`, `glitch`, `streaks`, `haze`

**Poses**: `run`, `sneak`, `nod`, `shake`, `sad`, `point`, `wave`, `fall`

**Cameras**: `wide`, `medium`, `close`, `low`, `high`, `orbit`, `in`, `out`, `l`, `r`

Credits for the models are in [CREDITS.md](CREDITS.md).

---

## Writing for the ear

The whole movie is heard. The picture supports it; it does not replace it.

- **One to three sentences per scene, 20 to 60 words.** Speech runs at roughly 150 words a minute, so a 7-scene episode is about 2 minutes. Five to nine scenes per episode works well.
- **Every scene changes the picture** in some way: a new place, a new character position, a new effect or a new camera move.
- **Open each episode by saying where we are** and who is there. End it on a step forward or a question.
- **Use dialogue.** Alternate narrator and characters. Character lines should sound like speech, not narration.
- **Avoid text that is hard to speak aloud:** digits and symbols (write "eight hundred and two thousand"), abbreviations, long lists, unusual spellings of names.
- **Give each character a different `pitch`** so listeners can tell voices apart.
- **Real stories with an ending.** The last scene of the last episode should resolve the story.
- **Public-domain adaptations are fine; copyrighted stories and real people are not.** Retell or invent.

---

## Checklist before importing

1. `schemaVersion` is `1` and the `slug` is new, or you want to replace that movie.
2. Every `speaker` is `narrator` or a cast id. Every id in `characters` is in the cast.
3. The first scene of every episode sets `place` and `time`.
4. All values come from the vocabulary above.
5. Whoever speaks is in the scene's `characters`.
6. `npm run movie:validate -- file.json` prints a ✓.
