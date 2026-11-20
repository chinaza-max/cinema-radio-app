/*
 * Render a cinema movie's poster from its `cover` scene, using the same 3D engine the player uses.
 *
 *   npm start            (in another terminal, so the page and models are served)
 *   node scripts/render-poster.cjs seed/movies/my-movie.json [baseUrl]
 *
 * Writes public/posters/<slug>.jpg (600 x 900). Needs Playwright with Chromium (`npm i -D playwright` or a global install).
 * Then set  "poster": "/posters/<slug>.jpg"  in the movie file.
 */
const fs = require('fs');
const path = require('path');
const movie = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const base = process.argv[3] || 'http://localhost:3101';
if (movie.style !== 'cinema') throw new Error('Only cinema style movies have 3D posters.');

const cover = movie.cover;
const ids = [...new Set((cover.characters || []).map((c) => c.split(':')[0]))];
const q = new URLSearchParams({
  place: cover.place,
  time: cover.time,
  props: (cover.props || []).join(','),
  fx: (cover.fx || []).join(','),
  c: (cover.characters || []).join(','),
  cam: cover.camera || 'wide',
  models: ids.map((id) => `${id}:${movie.cast[id].model}`).join(','),
  size: '600x900',
  title: movie.title,
  tag: movie.genre,
  sec: '8',
});

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 600, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(`${base}/lab/index.html?${q}`);
  await page.waitForFunction(() => window.labReady || document.getElementById('log').textContent.includes('FAILED'), null, { timeout: 120000 });
  if ((await page.locator('#log').textContent()).includes('FAILED')) throw new Error(await page.locator('#log').textContent());
  await page.waitForTimeout(3000); // let the idle animation settle
  await page.evaluate(() => window.cine.setPlaying(false)); // freeze: a still frame is also much faster to capture
  await page.waitForTimeout(2500);
  const out = path.join(__dirname, '..', 'public', 'posters', `${movie.slug}.jpg`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.locator('#st').screenshot({ path: out, type: 'jpeg', quality: 84, timeout: 120000 });
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
  await browser.close();
})();
