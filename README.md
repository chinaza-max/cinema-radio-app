# Cinebox

Narrated, animated story movies for phones. A viewer picks a story, presses play, and hears it read aloud while an illustrated scene changes with every line. Movies are grouped by genre on the home page, played episode by episode, and created by importing a JSON file.

- **Backend:** NestJS 11 + MongoDB through Mongoose. It serves the JSON API **and** the web page.
- **Frontend:** plain ES modules in `public/`. No framework, no bundler, no build step.
- **Narration:** the browser's built-in speech (free). **Pictures:** SVG drawn by code in the browser (free). No AI runs while people watch.
- **Movies:** written once (by a person or an AI) as a JSON file, validated, compiled and stored. Playback costs nothing per viewer.

> **If you are an AI agent about to change this repo, read [AGENTS.md](AGENTS.md) after this file.** To create a new movie, read [docs/MOVIE_FORMAT.md](docs/MOVIE_FORMAT.md).

---

## Quick start

Requires Node 20 or newer and a MongoDB server (local, Docker or Atlas).

```bash
npm install
cp .env.example .env          # optional; the defaults point at MongoDB on localhost
docker compose up -d          # local MongoDB on port 27017 (skip if you use Atlas or your own server)
npm run start:dev             # http://localhost:3000
```

On the first start the database is empty, so the five demo movies in `seed/movies/` are imported automatically (development only).

| Command | What it does |
| --- | --- |
| `npm run start:dev` | Run with auto-reload |
| `npm run build && npm run start:prod` | Compile to `dist/` and run |
| `npm test` | Unit tests (schema, scene compiler) |
| `npm run test:e2e` | API + page tests against a throwaway MongoDB (see "Testing" below) |
| `npm run check:vocab` | Fail if the scene engine and `vocabulary.json` disagree |
| `npm run movie:validate -- file.json` | Check a movie file, no database needed |
| `npm run movie:import -- file.json` | Validate and save a movie into the configured database |

Before you finish any change, run: `npm test && npm run test:e2e && npm run check:vocab && npm run build`.

---

## How it works

There are **three shapes of data**. Understanding them is the key to the whole project.

```
 AUTHORING FORMAT                 PLAYBACK FORMAT                     PICTURE
 (what people and AIs write)      (what the API serves)               (what the viewer sees)

 movie.json                       scenes with every field filled in   <svg> string
 compact, inherits from the  ──►  and short keys (s, t, p, tm, …) ──► from scene-engine.js
 previous scene                   stored in MongoDB              animated by CSS
        │                                   ▲
        └── validate (zod) ── compile ──────┘
            movie-format.ts   scene-compiler.ts
```

1. **Authoring format.** One JSON file per movie. A scene only states what changes ("same place, same props, now Kemi walks right"). Specified in [docs/MOVIE_FORMAT.md](docs/MOVIE_FORMAT.md) and enforced by `src/movies/movie-format.ts`.
2. **Playback format.** On import the server *compiles* the file: every scene gets its place, time, props, effects and characters written out in full. The browser never has to remember "what was on screen before". Defined in `src/movies/scene-compiler.ts`.
3. **Picture.** `public/js/scene-engine.js` turns one playback scene into an SVG string. It is a set of pure functions with no DOM access. CSS in `public/css/app.css` animates it.

### What happens when someone opens the site

```
GET /            WebController → WebService
                 catalog (cached in memory) → finished HTML: hero + genre rows + poster titles
                 browser paints immediately, before any JavaScript runs
                 public/js/app.js (ES module) then:
                   · adds "Continue watching" from localStorage
                   · draws poster artwork only as each poster scrolls near the screen

tap a poster     app.js intercepts the link (no page reload)
                 GET /api/movies/:slug           cast + episode list, no scenes
tap Play         GET /api/movies/:slug/episodes/:n   scenes for that episode only
                 the next episode is prefetched while the current one plays
player           for each scene: draw SVG → speak the line → highlight words → next scene
```

Deep links work: `/m/:slug` and `/m/:slug/:n` return an empty shell and `app.js` fills it in. Opening a player link directly shows the right scene **paused** (browsers block speech until the viewer taps).

---

## Project map

```
src/
  main.ts                    starts Nest: compression, static files, body limit
  app.module.ts              wires modules; connects to MongoDB (MONGODB_URI)
  config/paths.ts            absolute paths to public/, views/, seed/
  common/                    slugify(), esc() / jsonForScript() for HTML
  genres/                    Genre schema + service ("ensure genre by name", atomic)
  movies/
    movie-format.ts          ★ authoring-format validation (zod). The contract.
    scene-compiler.ts        ★ authoring → playback format, inheritance rules
    vocabulary.json          ★ every place/prop/fx/hat/… a movie may use
    vocab.ts                 typed access to vocabulary.json
    movie.schema.ts          Mongoose schema: one document per movie, episodes embedded
    movies.service.ts        import (atomic upsert), delete, publish, cached reads

    movies.controller.ts     public JSON API (/api/…)
  admin/                     x-api-key guard + /api/admin/movies endpoints
  web/                       server-rendered home page + app shell, ETag handling
  seed/                      imports seed/movies/*.json when the DB is empty (dev)
  cli/                       movie:validate and movie:import commands
views/index.html             HTML template (one placeholder: <!--APP-->)
public/
  css/app.css                all styles + scene animation classes
  js/app.js                  router, home hydration, lazy artwork
  js/views.js                movie page, player shell, error view (HTML strings)
  js/player.js               playback engine: scene → speech → next
  js/speech.js               browser text-to-speech wrapper
  js/api.js                  fetch + in-memory cache + prefetch
  js/util.js                 helpers, watch progress in localStorage
  js/scene-engine.js         ★ draws a scene as SVG (places, props, characters, effects)
seed/movies/                 five demo movies (authoring format)
docs/                        movie format spec + a small example movie
scripts/check-vocab.mjs      keeps engine and vocabulary.json in sync
test/                        e2e tests
```

★ = files where most feature work happens.

---

## API

All responses are JSON unless noted. Public GETs are cached in memory on the server and sent with `Cache-Control: public, max-age=30, stale-while-revalidate=300`. After an import, viewers may see old data for up to about half a minute.

| Method and path | Purpose |
| --- | --- |
| `GET /` | Home page (HTML). `?fragment=1` returns just the inner markup. |
| `GET /m/:slug`, `GET /m/:slug/:n` | App shell (HTML) |
| `GET /admin` | Admin dashboard (HTML) |
| `GET /api/catalog` | `{ featured, genres: [{ slug, name, movies: [summary] }] }` |
| `GET /api/movies/:slug` | Movie page data: synopsis, cast, cover, episode list (no scenes) |
| `GET /api/movies/:slug/episodes/:n` | `{ n, title, scenes }`. `n` starts at 1. |
| `GET /api/genres` | Genre list |
| `GET /api/vocabulary` | Everything a movie file may use |
| `GET /api/audio/voices` | List available neural storytelling voices |
| `GET /api/audio/speak` | Stream natural MP3 voice narration for a text line |
| `GET /api/health` | `{ ok: true }` |
| `POST /api/admin/movies` | Import or replace (by slug). Body = a movie file. `201` or `400 { issues: [...] }` |
| `GET /api/admin/movies` | All movies including drafts |
| `PATCH /api/admin/movies/:slug/publish` | Body `{ "published": true \| false }` |
| `DELETE /api/admin/movies/:slug` | Remove a movie and its episodes |

Admin routes need the header `x-api-key: <ADMIN_API_KEY>`. If `ADMIN_API_KEY` is empty, they return 403.

```bash
curl -X POST http://localhost:3000/api/admin/movies \
  -H "x-api-key: $ADMIN_API_KEY" -H "content-type: application/json" \
  --data-binary @my-movie.json
```

---

## Data model

Two MongoDB collections (Mongoose schemas: `src/genres/genre.schema.ts`, `src/movies/movie.schema.ts`).

```
genres  { slug (unique), name, sortOrder }

movies  { slug (unique), title, synopsis, credit,
          genre: { slug, name },            copy of the genre, so a movie shows without a second lookup
          featured, published,
          cover, coverCast, cast,           playback-format cover scene; the cast members on the cover; the full cast
          episodeCount, totalMinutes, schemaVersion,
          episodes: [ { position, title, sceneCount, minutes, scenes: [ … ] } ],
          createdAt, updatedAt }
indexes: movies.slug (unique), movies { published, genre.slug }, genres.slug (unique)
```

- **One document per movie, episodes embedded.** A whole movie is replaced by a single atomic `findOneAndUpdate` upsert on `slug`. No transactions, no replica set needed. A movie is about 0.33 KB per scene (a 300-scene movie is roughly 100 KB), far below MongoDB's 16 MB document limit.
- **Reads use projections so scenes stay in the database until needed:** the home page reads without `cast` and `episodes`; the movie page reads with `{ 'episodes.scenes': 0 }`; one episode is read with `$slice: [n - 1, 1]`.
- One genre per movie. A genre row is created the first time a movie names it (atomic upsert on `slug`, so two imports at once cannot create it twice). Names match case-insensitively through the slug.
- The home page shows one row per genre, newest movie first. Rows are ordered by `sortOrder`, then name.
- The hero is the most recently updated movie with `"featured": true`, otherwise the newest movie.
- Scenes are stored in the playback format. Mongoose holds them as `Mixed`, so Mongoose does not validate their contents; `movie-format.ts` does that before anything is written.

---

## Creating a movie

1. Give an AI [docs/MOVIE_FORMAT.md](docs/MOVIE_FORMAT.md) (it contains a ready-to-paste prompt) plus your story idea. It returns one JSON file.
2. Check it: `npm run movie:validate -- my-movie.json`. Errors name the exact scene and field, for example `episodes.2.scenes.4.place: unknown place "desert". Allowed: …`.
3. Import it: `npm run movie:import -- my-movie.json`, or `POST` it to `/api/admin/movies`. Importing the same `slug` again replaces the movie.
4. Refresh the site. The movie appears under its genre.

Hand the validator's error text back to the AI and it can fix the file itself.

---

## Extending the vocabulary

A movie can only use places, props, effects, hats and held items that the scene engine can draw. To add one (for example a `desert` place or a `lamp` prop):

1. Add the drawing function in `public/js/scene-engine.js`:
   - place → `PLACES.<name>(P, id, R, sc)` and its ground line in `GY`
   - prop → `PROPS.<name>(sc, P, id, R)`
   - hat → `HATS.<name>(c)` · held item or accessory → `EXTRA.<name>`
   - time of day → a palette in `SKY` (and `DARK()` if it is dark)
   - effect → an `if (f.includes('<name>'))` block in `fxMarkup`, and the name in `VOCAB.fx`
2. Add any new animation class to `public/css/app.css`.
3. Add the name to `src/movies/vocabulary.json`.
4. Run `npm run check:vocab`. It prints exactly what is out of sync.
5. Use it in a movie and add it to the table in `docs/MOVIE_FORMAT.md`.

Rules for engine code: pure functions, no DOM, no network. Use `R()` (seeded random) and never `Math.random()`, so a scene always looks the same. Every element that moves needs a CSS class, and every animation must be stopped by `.still *` and by `prefers-reduced-motion`.

---

## Performance rules (keep these true)

Speed is a requirement. Each rule below is already implemented; do not undo it.

- **Home is server-rendered and cached.** Finished HTML in the first response, built once per catalog change, sent with an ETag (`304` when unchanged). About 1.7 KB gzipped for the demo catalog.
- **List data never carries scenes.** `/api/catalog` and `/api/movies/:slug` are small, and MongoDB projections keep scenes out of those reads entirely. Scenes load per episode, and only when played.
- **Reads come from memory.** The catalog and each movie or episode response are cached as ready-made JSON strings and cleared on any import, delete or publish change.
- **No framework, no build, no bundle.** About 11 KB gzipped for the whole scene engine. Do not add a UI framework without a measured reason.
- **Artwork is drawn lazily.** Posters render only when they are within 300 px of the screen (`IntersectionObserver`). Genre sections use `content-visibility: auto`.
- **Fonts never block rendering.** They load with `media="print"` and swap in.
- **Prefetching.** The next episode loads while the current one plays; a movie's data loads when its poster is touched.
- **Compression** is on for all text responses.

Measured on the demo catalog (phone-sized Chromium, local server): first contentful paint about 160 ms, hero artwork drawn about 220 ms after navigation start.

---

## Configuration

Set in `.env` (see `.env.example`).

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | | `production` turns off demo seeding |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/cinebox` | MongoDB connection string. Atlas: `mongodb+srv://user:pass@cluster.xxxx.mongodb.net/cinebox` |
| `ADMIN_API_KEY` | empty | Secret for `/api/admin/*`. Empty disables the admin API. |
| `SEED_ON_BOOT` | `true` outside production | Import `seed/movies/*.json` when the database has no movies |
| `TEST_MONGODB_URI` | | Tests only: use this server instead of starting a throwaway one. The database name must contain `test`; it is **dropped** after the run. |

---

## Testing

- `npm test` needs nothing else.
- `npm run test:e2e` talks to a real MongoDB. By default it starts a throwaway `mongod` with `mongodb-memory-server`, which **downloads the MongoDB binary on the first run** (internet needed, then cached). To use a server you already have, set `TEST_MONGODB_URI=mongodb://127.0.0.1:27017/cinebox-test`. To use an installed binary, set `MONGOMS_SYSTEM_BINARY=/path/to/mongod`.
- Verified against MongoDB 8.0 with Mongoose 8.

---

## Known gaps and roadmap

Be honest about these when planning work.

**Not done yet**
- **Only tested on a local MongoDB 8.** Atlas, replica sets and older MongoDB versions have not been tried. The queries used (upsert, projection with a nested exclusion, `$slice`) are standard.
- **Indexes are built by Mongoose on startup** (`autoIndex`). Fine for this size. For a large production deployment, create the indexes ahead of time and disable `autoIndex`.
- **Changing the stored shape.** Adding a field with a default is safe. For anything breaking, bump `schemaVersion`, keep the old movie files, and re-import them (importing is idempotent by slug). There is no migration tool.
- **Package pin.** Keep `@nestjs/mongoose` at `^11` and `mongoose` at `^8`. `@nestjs/mongoose` 12 is ESM-only and does not load in this CommonJS project.
- **Frontend has no automated tests.** The browser code was checked by hand in a phone-sized browser. Backend has unit and e2e tests.
- **iOS Safari narration is unverified.** `unlockSpeech()` is meant to satisfy its tap-to-speak rule but has not been tried on a device.
- **Static assets are not content-hashed.** They are cached for 1 hour with ETags. Add hashed filenames if you add a build step.
- **Security hardening:** no rate limiting (`@nestjs/throttler`), no security headers (`helmet`), no CORS policy. The admin key is a single shared secret.
- **Brotli** is not enabled in Node; do it at your reverse proxy or CDN.
- **Fonts** load from Google Fonts. Self-host them for the fastest and most private setup.

**Ideas, roughly in order of value**
1. Admin web page for importing, previewing, publishing and deleting movies.
2. More places and props (desert, city street, classroom, market, village square, spaceship). Each one widens what every future movie can show.
3. Pre-generated voices: call a text-to-speech API once per line, store the audio, and play files (replace `public/js/speech.js`). Cost is per movie, not per viewer.
4. AI-generated artwork per scene, generated once and cached, in place of or alongside the SVG engine.
5. Accounts, favourites and cross-device "continue watching" (replace localStorage in `util.js` with API calls and a `users` collection).
6. Search, multiple genres per movie, ratings, thumbnails for sharing links.
7. Languages other than English (the schema has no language field yet).
# cinema-radio-app

## Cinema style (3D)

Movies with `"style": "cinema"` play in a Three.js engine (`public/js/cinema/`): rigged characters from `public/models/`, procedural sci-fi sets, bloom, camera shots and lip sync driven by the voice level. The engine is lazy-loaded only when such a movie plays; three.js is served from `node_modules` under `/vendor/three/` (see the import map in `views/index.html`). Format details: `docs/MOVIE_FORMAT.md`; model credits: `docs/CREDITS.md`.

- Scene lab (try a set, model or shot): `/lab/index.html?place=bridge&time=dim&c=vale:150&models=vale:soldier&cam=medium`
- Poster for a cinema movie (server running): `NODE_PATH=$(npm root -g) node scripts/render-poster.cjs seed/movies/<slug>.json`
- Add a place, prop or model: edit `public/js/cinema/sets.js` / `actors.js`, `public/js/cinema/vocab.js` and `src/movies/vocabulary.json`, then `npm run check:vocab`.
- `?q=low|medium|high` forces the quality tier.
- Skies are alive: every planet turns, stars drift and falling stars cross (`shootingStars` in `gfx.js`). Characters only gesture when a scene asks for a pose; head dips on stressed words are rare and small.
- Loading: the characters of the first scene load first behind a progress bar (`loadProgress`), the rest in the background; a failed model download is retried twice. `/models/` is cached for a week.

## Deploying to Vercel

Vercel's NestJS preset runs `src/main.ts` as the function; no `vercel.json` is needed. `npm run build` also copies three.js into `public/vendor/three` (the `postbuild` script) so it can be served as a static file.

Set these **Environment Variables** in the Vercel project (Settings → Environment Variables), then redeploy:

| Name | Value |
| --- | --- |
| `MONGODB_URI` | A MongoDB Atlas URI, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/cinebox`. In Atlas, Network Access must allow `0.0.0.0/0` (Vercel has no fixed IPs). |
| `ADMIN_API_KEY` | A long random key for `/api/admin/*`. |
| `SEED_ON_BOOT` | `true` once, to add the demo movies to an empty database (it only adds missing ones). |

Notes: the filesystem is read-only, so generated voice files go to `/tmp`; the Edge-TTS python script does not run on Vercel, so voices fall back to the Google fallback unless you host the app on a server (Render, Railway, Fly, a VPS) instead.


## Toon characters
`model: "toon"` builds a cartoon human in code (`public/js/cinema/toon.js`), so every character can look different without downloads. See `docs/MOVIE_FORMAT.md` and `docs/ADDING_CHARACTERS.md`. Extras `visor` (glowing face screen) and `halo` (orbiting lights) make an AI character; see `the-lantern-keepers`. The sample movie `lightning-rider` uses it with the `city` set and the `dash` pose.
