/*
 * The player: shows one scene at a time, speaks its line, highlights the words as they are spoken,
 * then moves on. Mounted into markup produced by views.playerView().
 *
 *   const player = mountPlayer(root, { movie, n, episode, autoplay, startAt, goToEpisode });
 *   player.destroy();   // always call when leaving the page
 *
 * movie    : /api/movies/:slug response          episode : /api/movies/:slug/episodes/:n response
 * n        : 1-based episode number              startAt : scene index to open on
 * autoplay : start speaking immediately (only when entered through a tap, browsers block speech otherwise)
 * goToEpisode(n, { autoplay, fresh }) : navigate to another episode (supplied by app.js)
 */
import { prefetchEpisode } from './api.js';
import { sceneSvg } from './scene-engine.js';
import { cancelSpeech, cycleVoice, getSelectedVoice, HAS_TTS, speak } from './speech.js';
import { $, clearProgress, esc, saveProgress, words } from './util.js';
import { ICON } from './views.js';

const RATES = [0.9, 1, 1.15];
const NARRATOR_VOICE = { pitch: 0.95, rate: 0.95 };
const GAP_MS = 450; // pause between lines
const NEXT_EPISODE_DELAY_MS = 5000;

let sessionRate = 1; // narration speed survives episode changes

export const currentRate = () => sessionRate;

export function mountPlayer(root, ctx) {
  const { movie, n, episode, goToEpisode } = ctx;
  const scenes = episode.scenes;
  const isLastEpisode = n >= movie.episodes.length;
  const stage = $('#stage', root);
  const layers = stage.querySelectorAll('.layer');
  const cap = $('#cap', root);
  const segButtons = root.querySelectorAll('#segs .sg');
  const ac = new AbortController();

  const st = { i: 0, playing: false, layer: 0, token: 0, timer: null, gap: null, userActed: !!ctx.autoplay };

  if (!isLastEpisode) prefetchEpisode(movie.slug, n + 1);

  const estimateSeconds = (scene) => Math.max(4, words(scene.t) / (2.5 * sessionRate) + 1);

  function stop() {
    st.token++;
    clearTimeout(st.timer);
    clearTimeout(st.gap);
    cancelSpeech();
  }

  function setPlayButton() {
    const pp = $('#pp', root);
    if (pp) pp.innerHTML = st.playing ? ICON.pause : ICON.play;
    stage.classList.toggle('paused', !st.playing);
  }

  function markProgress() {
    segButtons.forEach((b, i) => {
      b.classList.toggle('done', i < st.i);
      b.classList.toggle('cur', i === st.i);
    });
    // A paused page opened from a link must not overwrite where the viewer really was.
    if (st.userActed) saveProgress(movie.slug, { e: n - 1, i: st.i, title: movie.title, epTitle: episode.title });
  }

  function showScene(scene, seconds) {
    const next = layers[st.layer ^ 1];
    const current = layers[st.layer];
    stage.style.setProperty('--dur', seconds + 's');
    next.innerHTML = sceneSvg(scene, movie.cast);
    next.classList.add('on');
    current.classList.remove('on');
    st.layer ^= 1;
    stage.classList.toggle('fl', !!scene.fl);
  }

  function showCaption(scene) {
    const who = movie.cast[scene.s];
    const name = who ? who.name : 'Narrator';
    const colour = who ? who.tag || who.coat : 'var(--amber)';
    let pos = 0;
    const html = scene.t
      .split(/(\s+)/)
      .map((part) => {
        const out = /^\s+$/.test(part) ? part : `<span data-p="${pos}">${esc(part)}</span>`;
        pos += part.length;
        return out;
      })
      .join('');
    cap.innerHTML = `<span class="who" style="--c:${esc(colour)}"><i></i>${esc(name)}</span><p class="line">${html}</p>`;
  }

  function highlight(charIndex) {
    let best = null;
    cap.querySelectorAll('.line span').forEach((s) => {
      s.classList.remove('cur');
      if (Number(s.dataset.p) <= charIndex) best = s;
    });
    if (best) best.classList.add('cur');
  }

  function playScene(index) {
    stop();
    if (index < 0) index = 0;
    if (index >= scenes.length) return endEpisode();
    st.i = index;
    const scene = scenes[index];
    const seconds = estimateSeconds(scene);
    showScene(scene, seconds + 1);
    showCaption(scene);
    markProgress();
    setPlayButton();
    if (!st.playing) return;

    const token = ++st.token;
    const advance = () => {
      if (token !== st.token) return;
      clearTimeout(st.timer);
      st.gap = setTimeout(() => {
        if (token === st.token && st.playing) playScene(st.i + 1);
      }, GAP_MS);
    };

    if (!HAS_TTS) {
      st.timer = setTimeout(advance, seconds * 1000);
      return;
    }
    const voice = movie.cast[scene.s] || NARRATOR_VOICE;
    cancelSpeech();
    setTimeout(() => {
      if (token !== st.token) return;
      st.timer = setTimeout(advance, (seconds * 2.2 + 5) * 1000); // safety net if the browser never fires onend
      try {
        speak(scene.t, {
          pitch: voice.pitch ?? 1,
          rate: sessionRate * (voice.rate ?? 1),
          onboundary: (i) => token === st.token && highlight(i),
          onend: advance,
          onerror: () => {
            if (token !== st.token) return;
            clearTimeout(st.timer);
            st.timer = setTimeout(advance, seconds * 1000);
          },
        });
      } catch {
        clearTimeout(st.timer);
        st.timer = setTimeout(advance, seconds * 1000);
      }
    }, 60);
  }

  function endEpisode() {
    stop();
    const wasPlaying = st.playing;
    st.playing = false;
    setPlayButton();
    segButtons.forEach((b) => {
      b.classList.add('done');
      b.classList.remove('cur');
    });
    if (isLastEpisode) clearProgress(movie.slug);
    else saveProgress(movie.slug, { e: n, i: 0, title: movie.title, epTitle: movie.episodes[n].title });

    const next = movie.episodes[n]; // episodes[n] is episode n+1
    cap.innerHTML = `<div class="endc"><h3>${isLastEpisode ? 'The End' : `Episode ${n} complete`}</h3>
<p>${isLastEpisode ? `${esc(movie.title)} is finished. Watch again, or pick another story.` : `Up next: ${esc(next.title)}. It starts in a few seconds.`}</p>
<div class="row">${
      isLastEpisode
        ? `<button class="btn" data-act="restart">Watch again</button><a class="btn ghost" href="/" data-link>Home</a>`
        : `<button class="btn" data-act="nextep">Next episode now</button><button class="btn ghost" data-act="replay">Replay</button>`
    }</div></div>`;

    if (!isLastEpisode && wasPlaying) {
      const token = ++st.token;
      st.timer = setTimeout(() => token === st.token && goToEpisode(n + 1, { autoplay: true, fresh: true }), NEXT_EPISODE_DELAY_MS);
    }
  }

  const actions = {
    toggle() {
      if (st.playing) {
        st.playing = false;
        stop();
        setPlayButton();
      } else {
        st.playing = true;
        playScene(st.i);
      }
    },
    next: () => (st.i + 1 >= scenes.length ? endEpisode() : playScene(st.i + 1)),
    prev: () => playScene(Math.max(0, st.i - 1)),
    seek: (el) => playScene(Number(el.dataset.i)),
    speed(el) {
      sessionRate = RATES[(RATES.indexOf(sessionRate) + 1) % RATES.length];
      el.textContent = sessionRate + 'x';
      if (st.playing) playScene(st.i);
    },
    voice(el) {
      const nextVoice = cycleVoice();
      el.textContent = nextVoice.name;
      if (st.playing) playScene(st.i);
    },
    nextep: () => goToEpisode(n + 1, { autoplay: true, fresh: true }),
    replay: () => goToEpisode(n, { autoplay: true, fresh: true }),
    restart: () => goToEpisode(1, { autoplay: true, fresh: true }),
  };

  root.addEventListener(
    'click',
    (ev) => {
      const el = ev.target.closest('[data-act]');
      const action = el && actions[el.dataset.act];
      if (!action) return;
      st.userActed = true;
      action(el);
    },
    { signal: ac.signal },
  );

  document.addEventListener(
    'keydown',
    (ev) => {
      if (ev.target !== document.body) return;
      if (ev.key === ' ') {
        ev.preventDefault();
        st.userActed = true;
        actions.toggle();
      } else if (ev.key === 'ArrowRight') actions.next();
      else if (ev.key === 'ArrowLeft') actions.prev();
    },
    { signal: ac.signal },
  );

  // Open on the requested scene. Speak straight away only if we were entered by a tap.
  st.i = Math.min(Math.max(0, ctx.startAt || 0), scenes.length - 1);
  st.playing = !!ctx.autoplay;
  playScene(st.i);

  return {
    destroy() {
      st.playing = false;
      stop();
      ac.abort();
    },
  };
}
