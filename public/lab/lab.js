/*
 * Scene lab: preview one cinema scene without a database or a movie file. Used by authors and for visual checks.
 *   /lab/index.html?place=bridge&time=night&c=captain:120,doctor:260&cam=medium&speaker=captain&props=hologram&fx=dust&q=high
 * Models are chosen with &models=captain:soldier,doctor:michelle,...
 */
import { createCinema } from '/js/cinema/index.js';
import { MODELS } from '/js/cinema/actors.js';
const q = new URLSearchParams(location.search);
const list = (k) => (q.get(k) ? q.get(k).split(',') : []);
const models = Object.fromEntries(list('models').map((x) => x.split(':')));
if (q.get('flip')) { const [m, v] = q.get('flip').split(':'); MODELS[m].flip = v === '1'; }
const cast = {};
for (const [id, model] of Object.entries(models)) cast[id] = { name: id, model };
// &look=<json> merges extra cast fields per character, e.g. {"zed":{"coat":"#2a6","gear":"cape,bolt"}}
try { for (const [id, f] of Object.entries(JSON.parse(q.get('look') || '{}'))) Object.assign(cast[id] ??= { name: id, model: 'toon' }, f); } catch {}
if (q.get('size')) {
  const [w, h] = q.get('size').split('x');
  Object.assign(document.getElementById('st').style, { width: w + 'px', height: h + 'px', aspectRatio: 'auto' });
}
if (q.get('title')) {
  // Poster mode: a title and a darkened foot, so the picture works as a movie poster.
  const t = document.createElement('div');
  t.className = 'poster-title';
  t.innerHTML = `<small>${q.get('tag') || ''}</small><b></b>`;
  t.querySelector('b').textContent = q.get('title');
  document.getElementById('st').append(t);
}
const log = (m) => (document.getElementById('log').textContent += m + '\n');
window.addEventListener('error', (e) => log('ERROR ' + e.message));
try {
  const cine = await createCinema(document.getElementById('c'), { cast });
  window.cine = cine;
  await cine.show(
    { s: q.get('speaker') || 'N', p: q.get('place') || 'bridge', tm: q.get('time') || 'night', pr: list('props'), fx: list('fx'), c: list('c').map((x) => x.replace(/^([a-z0-9]+):(\d+)$/, '$1:$2')), cam: q.get('cam') || 'wide', fl: 0 },
    { seconds: +q.get('sec') || 6 },
  );
  if (q.get('speaker')) cine.setSpeaker(q.get('speaker'), () => 0.4 + 0.4 * Math.sin(performance.now() / 90));
  cine.setPlaying(q.get('play') !== '0');
  window.labReady = true;
  log('ready ' + cine.quality);
} catch (e) {
  log('FAILED ' + (e.stack || e));
}
