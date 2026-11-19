# Instructions for AI agents working on Cinebox

Read [README.md](README.md) first. It explains the architecture, the three data formats, the project map and the performance rules. This file lists the working rules.

## Before you change anything

1. Find the area in the README's project map. Open only the files you need.
2. If the task is "make a movie", stop reading code. Read `docs/MOVIE_FORMAT.md` and `docs/example-movie.json`, then write one JSON file.
3. Run the baseline once: `npm test && npm run test:e2e && npm run check:vocab`. Know what passes before you start. The e2e tests need MongoDB: they download a throwaway `mongod` on first run, or use `TEST_MONGODB_URI` (see README, Testing).

## Before you say you are done

Run all of these and fix what fails:

```bash
npm test
npm run test:e2e
npm run check:vocab
npm run build
npm run movie:validate -- seed/movies/*.json
```

If you changed anything the viewer sees (`public/`, `views/`, `src/web/`), also start the server (`PORT=3101 npm run start:dev`), open it at phone width (about 390 px), and check the home page, a movie page and the player. There are no automated frontend tests, so your own check is the only check. Do not report UI work as done without it.

## Hard rules

- **The movie format is a contract.** `src/movies/movie-format.ts`, `docs/MOVIE_FORMAT.md` and `src/movies/scene-compiler.ts` must always agree. If you change one, change the others and add a test. Existing movie files must keep validating unless you bump `schemaVersion` and write a migration.
- **The vocabulary has one source of truth:** `src/movies/vocabulary.json`. The engine must match it (`npm run check:vocab`). Follow "Extending the vocabulary" in the README.
- **Never hand-write the playback format.** Authors write the authoring format. The server compiles.
- **Do not serve scenes in list endpoints.** `/api/catalog` and `/api/movies/:slug` stay light. Scenes only come from `/api/movies/:slug/episodes/:n`. In `movies.service.ts` keep the MongoDB projections that leave `episodes.scenes` out; do not "simplify" to full-document reads.
- **Keep one movie = one document, written atomically.** Import is a single `findOneAndUpdate` upsert. Do not split a movie across writes or collections without a plan for partial failure.
- **Mongoose pins:** `@nestjs/mongoose` `^11` and `mongoose` `^8`. Version 12 of `@nestjs/mongoose` is ESM-only and breaks this CommonJS project. Do not upgrade it as a drive-by.
- **No framework, no bundler, no new runtime dependency** in `public/` unless you measured a need and said so in your summary. In `src/`, add a dependency only if the standard library and the existing ones cannot do it.
- **The engine is pure.** `scene-engine.js` must not touch the DOM, `window`, the network or `Math.random()`. It must keep running under plain Node (the vocab check depends on it).
- **Escape everything.** HTML built from data goes through `esc()` (browser) or `esc()` from `src/common/html.ts` (server). JSON placed in a `<script>` goes through `jsonForScript()`.
- **Do not weaken the admin guard.** Without `ADMIN_API_KEY`, admin routes return 403. Keep it that way.
- **Never commit secrets or database files.** `.env` is git-ignored.
- **Keep it accessible on a phone.** Tap targets at least 44 px, no horizontal page scroll at 360 px wide, respect `prefers-reduced-motion`.

## Conventions

- TypeScript in `src/`, plain ES modules in `public/js/`. Two-space indent, single quotes, semicolons in TS.
- Comments explain *why* and document contracts. Do not narrate what the code obviously does.
- One module per feature folder (`genres/`, `movies/`, `admin/`, `web/`). Services hold logic, controllers stay thin.
- New API behaviour needs an e2e test in `test/app.e2e-spec.ts`. New schema rules or compiler behaviour need a unit test next to the file.
- Keep the README accurate. If you add a route, env variable, command or folder, update the README in the same change.

## Where to put things

| You are adding | Put it in |
| --- | --- |
| A new field on movies | `movie-format.ts`, `scene-compiler.ts` if scenes, `movie.schema.ts` (Mongoose), `movies.service.ts` import, `docs/MOVIE_FORMAT.md`, tests |
| A new place, prop, effect, hat | `scene-engine.js`, `app.css`, `vocabulary.json`, `docs/MOVIE_FORMAT.md` |
| A public API route | `movies.controller.ts` (reads only), cache through `MoviesService.cached()` |
| An operator action | `admin.controller.ts`, behind `ApiKeyGuard` |
| A new page in the browser | route in `app.js`, markup in `views.js` |
| A different voice or audio source | replace `speech.js`, keep its exported functions |
| A new collection | `*.schema.ts` in the feature folder, register with `MongooseModule.forFeature`, declare indexes in the schema |

## When unsure

Prefer the smaller change. State assumptions in your summary. Do not rewrite working modules to match personal taste.
