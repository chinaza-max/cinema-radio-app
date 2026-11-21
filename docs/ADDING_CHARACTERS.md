# Adding characters

Cinema movies use three kinds of character. Pick per cast member with `model`.

| model | what it is | mouth | notes |
|---|---|---|---|
| `toon` | cartoon human built in code, no download | moves, blinks | look comes from cast fields (`skin`, `hair`, `hairstyle`, `gear`, `build`, colours). Unlimited variety. |
| `avatar`, `hologram` | GLB with mouth shapes | moves | |
| `soldier`, `michelle`, `android`, `robot` | GLB with animation clips | no | |

## Adding a GLB character (Gobkit, Kenney, Meshy, ...)

1. Download the `.glb` yourself and put it in `public/models/<name>.glb`. Keep it under about 3 MB for phones.
2. Register it in `MODELS` in `public/js/cinema/actors.js`:
   `name: { url: '/models/name.glb', bytes: <file size>, height: 1.75, clips: { idle: 'Idle', walk: 'Walk', run: 'Run' } }`
   `clips` maps our names (`idle`, `walk`, `run`, `nod`, `shake`, `sad`, `sneak`) to the clip names inside the file. Open the GLB in any viewer to read them. Missing clips fall back to a procedural sway.
3. Add the name to `models` in both `src/movies/vocabulary.json` and `public/js/cinema/vocab.js`, then run `npm run check:vocab`.
4. Use it with `"model": "name"` in a movie's cast and add a line to `docs/CREDITS.md`.

## Licences

- CC0 (Kenney, Gobkit): no attribution needed, still list the source in CREDITS.md.
- CC BY (Sloyd): attribution is required in CREDITS.md.
- Check the licence on the model's own page. Some "CC0" libraries rehost Mixamo or other characters whose terms differ; do not ship those unless you have verified the terms.
