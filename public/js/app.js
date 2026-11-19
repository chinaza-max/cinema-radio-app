/*
 * Browser entry point: router, home-page hydration and lazy artwork.
 *
 * Routes (the server returns the same shell for each; this file decides what to show):
 *   /              home         server-rendered, hydrated here
 *   /m/:slug       movie page   data from /api/movies/:slug
 *   /m/:slug/:n    player       n is the 1-based episode number
 *
 * Links marked data-link are handled here without a page reload.
 *   data-play   the tap should start narration (needed because browsers block speech without a tap)
 *   data-fresh  start at the first scene instead of resuming where the viewer stopped
 */
import { getHomeFragment, getMovie, getEpisode, getAdminMovies, importAdminMovie, togglePublishMovie, deleteAdminMovie } from './api.js';
import { mountPlayer, currentRate } from './player.js';
import { sceneSvg } from './scene-engine.js';
import { getSelectedVoice, HAS_TTS, unlockSpeech } from './speech.js';
import { $, esc, getLastWatched, getProgress } from './util.js';
import { errorView, movieView, playerView, resumeCard, adminLoginView, adminDashboardView } from './views.js';

const app = $('#app');
let homeHtml = $('#boot', app) ? app.innerHTML : null; // server-rendered home, captured before hydration
let unmount = null; // cleanup for the current page (player teardown, observers)
let navId = 0; // lets a slow request notice the viewer already moved on
const ADMIN_STORAGE_KEY = 'cinebox_admin_api_key';

/* ------------------------------------------------------------------ helpers */

function parse(path) {
  if (path === '/admin' || path.startsWith('/admin/')) return { page: 'admin' };
  const m = /^\/m\/([^/]+)(?:\/(\d+))?\/?$/.exec(path);
  if (m) return { page: m[2] ? 'player' : 'movie', slug: decodeURIComponent(m[1]), n: m[2] ? Number(m[2]) : null };
  return { page: 'home' };
}

function show(html, title) {
  if (unmount) unmount();
  unmount = null;
  app.innerHTML = html;
  document.title = title ? `${title} · Cinebox` : 'Cinebox';
  window.scrollTo(0, 0);
}

export function navigate(url, opts = {}) {
  history.pushState({}, '', url);
  return render(url, opts);
}

/* ------------------------------------------------------------------- pages */

async function showHome() {
  const id = ++navId;
  try {
    if (!homeHtml) homeHtml = await getHomeFragment();
  } catch {
    if (id === navId) show(errorView('Could not load the home page.'), '');
    return;
  }
  if (id !== navId) return;
  show(homeHtml, '');
  hydrateHome();
}

async function showMovie(slug) {
  const id = ++navId;
  show('<div class="loading" role="status">Loading…</div>', '');
  try {
    const movie = await getMovie(slug);
    if (id !== navId) return;
    show(movieView(movie, getProgress(slug)), movie.title);
  } catch (err) {
    if (id === navId) show(errorView(err.message === 'not-found' ? 'We could not find that story.' : 'Could not load this story.', err.message !== 'not-found'), '');
  }
}

async function showPlayer(slug, n, opts) {
  const id = ++navId;
  show('<div class="loading" role="status">Loading…</div>', '');
  try {
    const movie = await getMovie(slug);
    if (n < 1 || n > movie.episodes.length) throw new Error('not-found');
    const episode = await getEpisode(slug, n);
    if (id !== navId) return;

    const saved = getProgress(slug);
    const startAt = opts.fresh ? 0 : saved && saved.e === n - 1 ? saved.i : 0;
    show(playerView(movie, n, episode, HAS_TTS, currentRate(), getSelectedVoice().name), `${movie.title}: Episode ${n}`);
    const player = mountPlayer(app, {
      movie,
      n,
      episode,
      startAt,
      autoplay: !!opts.autoplay,
      goToEpisode: (next, o) => navigate(`/m/${encodeURIComponent(slug)}/${next}`, o),
    });
    unmount = () => player.destroy();
  } catch (err) {
    if (id === navId) show(errorView(err.message === 'not-found' ? 'We could not find that episode.' : 'Could not load this episode.', err.message !== 'not-found'), '');
  }
}

async function showAdmin(loginError = '') {
  const id = ++navId;
  const storedKey = sessionStorage.getItem(ADMIN_STORAGE_KEY);
  if (!storedKey) {
    show(adminLoginView(loginError), 'Admin Login');
    mountAdminLogin();
    return;
  }

  show('<div class="loading" role="status">Loading dashboard…</div>', 'Admin');
  try {
    const movies = await getAdminMovies(storedKey);
    if (id !== navId) return;
    show(adminDashboardView(movies), 'Admin Dashboard');
    mountAdminDashboard(storedKey);
  } catch (err) {
    if (id !== navId) return;
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    show(
      adminLoginView(err.message === 'auth-failed' ? 'Invalid API key or admin access disabled.' : 'Could not connect to admin API.'),
      'Admin Login',
    );
    mountAdminLogin();
  }
}

function mountAdminLogin() {
  const form = $('#admin-login-form', app);
  const defBtn = $('#use-default-key-btn', app);
  const defVal = $('#default-key-val', app);
  const keyInput = $('#admin-key-input', app);

  if (defBtn && defVal && keyInput) {
    defBtn.addEventListener('click', () => {
      keyInput.value = defVal.textContent.trim();
      keyInput.focus();
    });
  }

  if (form) {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const key = (keyInput ? keyInput.value : '').trim();
      if (!key) return;
      sessionStorage.setItem(ADMIN_STORAGE_KEY, key);
      showAdmin();
    });
  }
}

function mountAdminDashboard(apiKey) {
  const logoutBtn = $('#admin-logout-btn', app);
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem(ADMIN_STORAGE_KEY);
      showAdmin();
    });
  }

  const refreshBtn = $('#refresh-movies-btn', app);
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showAdmin();
    });
  }

  const fileInput = $('#movie-file-input', app);
  const fileChosen = $('#file-chosen-name', app);
  const importBtn = $('#import-btn', app);
  const importForm = $('#admin-import-form', app);
  const dropZone = $('#drop-zone', app);
  const feedback = $('#import-feedback', app);

  let selectedFileContent = null;

  const setFeedback = (type, html) => {
    if (!feedback) return;
    feedback.style.display = 'block';
    feedback.className = `admin-alert ${type}`;
    feedback.innerHTML = html;
  };

  const handleFile = (file) => {
    if (!file) return;
    if (fileChosen) fileChosen.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        selectedFileContent = JSON.parse(e.target.result);
        if (importBtn) importBtn.disabled = false;
        feedback.style.display = 'none';
      } catch (err) {
        selectedFileContent = null;
        if (importBtn) importBtn.disabled = true;
        setFeedback('error', `<p><b>Invalid JSON:</b> ${esc(err.message)}</p>`);
      }
    };
    reader.readAsText(file);
  };

  if (fileInput) {
    fileInput.addEventListener('change', (ev) => {
      const file = ev.target.files && ev.target.files[0];
      handleFile(file);
    });
  }

  if (dropZone) {
    dropZone.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (ev) => {
      ev.preventDefault();
      dropZone.classList.remove('dragover');
      const file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      handleFile(file);
    });
  }

  const togglePasteBtn = $('#toggle-json-paste', app);
  const pasteBox = $('#paste-box', app);
  if (togglePasteBtn && pasteBox) {
    togglePasteBtn.addEventListener('click', () => {
      const isHidden = pasteBox.style.display === 'none';
      pasteBox.style.display = isHidden ? 'block' : 'none';
      togglePasteBtn.textContent = isHidden ? 'Hide Paste Area' : 'Paste JSON Instead';
    });
  }

  const doImport = async (jsonObj) => {
    try {
      setFeedback('success', '<p>Validating and compiling movie...</p>');
      const res = await importAdminMovie(apiKey, jsonObj);
      setFeedback(
        'success',
        `<p>✓ <b>Successfully ${res.replaced ? 'updated' : 'imported'}</b> "${esc(res.title)}" (${esc(res.genre)}) · ${res.episodes} episodes · ${res.scenes} scenes · ~${res.minutes} min</p>`,
      );
      if (fileInput) fileInput.value = '';
      if (fileChosen) fileChosen.textContent = 'No file chosen';
      if (importBtn) importBtn.disabled = true;
      selectedFileContent = null;
      setTimeout(() => showAdmin(), 1200);
    } catch (err) {
      const issues = err.issues && err.issues.length ? `<ul>${err.issues.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
      setFeedback('error', `<p><b>Import failed:</b> ${esc(err.message)}</p>${issues}`);
    }
  };

  if (importForm) {
    importForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (selectedFileContent) doImport(selectedFileContent);
    });
  }

  const importPasteBtn = $('#import-paste-btn', app);
  const jsonPasteInput = $('#json-paste-input', app);
  if (importPasteBtn && jsonPasteInput) {
    importPasteBtn.addEventListener('click', () => {
      const text = jsonPasteInput.value.trim();
      if (!text) return;
      try {
        const obj = JSON.parse(text);
        doImport(obj);
      } catch (err) {
        setFeedback('error', `<p><b>Invalid JSON:</b> ${esc(err.message)}</p>`);
      }
    });
  }

  const movieList = $('#admin-movie-list', app);
  if (movieList) {
    movieList.addEventListener('click', async (ev) => {
      const pubBtn = ev.target.closest('[data-act="toggle-pub"]');
      if (pubBtn) {
        const slug = pubBtn.dataset.slug;
        const nextState = pubBtn.dataset.next === 'true';
        pubBtn.disabled = true;
        try {
          await togglePublishMovie(apiKey, slug, nextState);
          showAdmin();
        } catch (err) {
          alert(`Failed to update publish state: ${err.message}`);
          pubBtn.disabled = false;
        }
        return;
      }

      const delBtn = ev.target.closest('[data-act="delete-movie"]');
      if (delBtn) {
        const slug = delBtn.dataset.slug;
        const title = delBtn.dataset.title;
        if (confirm(`Are you sure you want to permanently delete "${title}" (${slug})?`)) {
          delBtn.disabled = true;
          try {
            await deleteAdminMovie(apiKey, slug);
            showAdmin();
          } catch (err) {
            alert(`Failed to delete movie: ${err.message}`);
            delBtn.disabled = false;
          }
        }
      }
    });
  }
}

function render(path, opts = {}) {
  const route = parse(path.split('?')[0]);
  if (route.page === 'admin') return showAdmin();
  if (route.page === 'player') return showPlayer(route.slug, route.n, opts);
  if (route.page === 'movie') return showMovie(route.slug);
  return showHome();
}

/* --------------------------------------------------------- home hydration */

/** Add "continue watching" and draw poster artwork lazily as posters approach the screen. */
function hydrateHome() {
  const last = getLastWatched();
  const slot = $('#resume', app);
  if (slot && last && last.title) slot.innerHTML = resumeCard(last);

  let art = {};
  try {
    art = JSON.parse($('#boot', app).textContent).art || {};
  } catch {
    /* no artwork data: posters stay as plain gradients */
  }

  const draw = (el) => {
    const data = art[el.dataset.art];
    if (!data || el.firstChild) return;
    if (el.classList.contains('pimg')) el.classList.add('still'); // posters are still frames; the hero moves
    el.innerHTML = sceneSvg(data.cover, data.coverCast || {});
  };

  const targets = [...app.querySelectorAll('[data-art]')];
  if (!('IntersectionObserver' in window)) {
    targets.forEach(draw);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          draw(entry.target);
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '300px 300px' },
  );
  targets.forEach((el) => io.observe(el));
  unmount = () => io.disconnect();
}

/* ------------------------------------------------------------------ events */

document.addEventListener('click', (ev) => {
  const reload = ev.target.closest('[data-act="reload"]');
  if (reload) {
    render(location.pathname + location.search, {});
    return;
  }
  const link = ev.target.closest('a[data-link]');
  if (!link || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
  if (link.target && link.target !== '_self') return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return;
  ev.preventDefault();
  const wantsPlay = link.hasAttribute('data-play');
  if (wantsPlay) unlockSpeech(); // must happen inside the tap for iOS Safari
  navigate(url.pathname, { autoplay: wantsPlay, fresh: link.hasAttribute('data-fresh') });
});

// Start loading a movie's data as soon as a poster is touched or hovered.
document.addEventListener(
  'pointerover',
  (ev) => {
    const poster = ev.target.closest && ev.target.closest('a.poster');
    if (!poster) return;
    const route = parse(new URL(poster.href).pathname);
    if (route.page === 'movie') getMovie(route.slug).catch(() => {});
  },
  { passive: true },
);

window.addEventListener('popstate', () => render(location.pathname));

/* -------------------------------------------------------------------- boot */

const first = parse(location.pathname);
if (first.page === 'home' && homeHtml) hydrateHome();
else render(location.pathname);
