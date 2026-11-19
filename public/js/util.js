/* Small helpers shared by the browser modules. No dependencies. */

export const $ = (selector, root = document) => root.querySelector(selector);

const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ENT[c]);

export const words = (text) => text.trim().split(/\s+/).length;

/* ---- watch progress, kept in this browser only ---- */
const KEY = 'cinebox.v1';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

/** Progress for one movie: { e: episodeIndex (0-based), i: sceneIndex, title, epTitle } or undefined. */
export function getProgress(slug) {
  return readAll()[slug];
}

/** The movie the viewer watched most recently, as { slug, ...progress } or null. */
export function getLastWatched() {
  const all = readAll();
  const slug = all.__last;
  return slug && all[slug] ? { slug, ...all[slug] } : null;
}

export function saveProgress(slug, progress) {
  try {
    const all = readAll();
    all[slug] = progress;
    all.__last = slug;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* private mode or storage full: progress is simply not remembered */
  }
}

export function clearProgress(slug) {
  try {
    const all = readAll();
    delete all[slug];
    if (all.__last === slug) delete all.__last;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
