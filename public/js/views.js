/*
 * HTML for the pages the browser builds itself: movie page, player shell, resume card, error.
 * (The home page is rendered on the server, see src/web/web.service.ts.)
 * Every function returns a string. Always pass user-visible data through esc().
 */
import { figSvg, sceneSvg } from './scene-engine.js';
import { esc } from './util.js';

export const ICON = {
  play: '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  pause:
    '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/></svg>',
  prev: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="2.6" height="14" rx="1"/><path d="M19 6.2v11.6a.8.8 0 0 1-1.25.66L9.4 12.66a.8.8 0 0 1 0-1.32l8.35-5.8A.8.8 0 0 1 19 6.2z"/></svg>',
  next: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="16.4" y="5" width="2.6" height="14" rx="1"/><path d="M5 6.2v11.6a.8.8 0 0 0 1.25.66l8.35-5.8a.8.8 0 0 0 0-1.32l-8.35-5.8A.8.8 0 0 0 5 6.2z"/></svg>',
};

/** "Continue watching" card for the home page. `last` comes from getLastWatched(). */
export function resumeCard(last) {
  return `<a class="resume" href="/m/${esc(last.slug)}/${last.e + 1}" data-link data-play>
  <span><em>Continue watching</em><b>${esc(last.title)}</b><em>Episode ${last.e + 1}: ${esc(last.epTitle)}</em></span>
  <span class="btn">Resume</span></a>`;
}

/** Movie page. `movie` is the /api/movies/:slug response; `progress` is saved progress or undefined. */
export function movieView(movie, progress) {
  const cinema = movie.style === 'cinema';
  const cast = Object.values(movie.cast)
    .filter((c) => !c.hidden)
    .map((c) => {
      // Classic movies draw each character as a small SVG; cinema characters are 3D models, so show their initial.
      const face = cinema
        ? `<i class="dot" style="--c:${esc(c.tag || c.coat)}" aria-hidden="true">${esc(c.name.slice(0, 1))}</i>`
        : `<svg viewBox="-24 -96 48 104" aria-hidden="true">${figSvg(c, { pose: '' })}</svg>`;
      return `<div class="cm">${face}<div><b>${esc(c.name)}</b>${c.role ? `<span>${esc(c.role)}</span>` : ''}</div></div>`;
    })
    .join('');
  const cover = cinema ? (movie.poster ? `<img src="${esc(movie.poster)}" alt="" decoding="async">` : '') : sceneSvg(movie.cover, movie.cast);

  const episodes = movie.episodes
    .map(
      (e) => `<a class="ep" href="/m/${esc(movie.slug)}/${e.n}" data-link data-play data-fresh>
  <span class="epn">EP ${e.n}</span>
  <span class="ept"><b>${esc(e.title)}${progress && progress.e === e.n - 1 ? '<em class="badge">Resume</em>' : ''}</b><span>${e.sceneCount} scenes</span></span>
  <span class="epd">~${e.minutes} min</span></a>`,
    )
    .join('');

  const resume = progress
    ? `<a class="btn ghost" href="/m/${esc(movie.slug)}/${progress.e + 1}" data-link data-play>Resume episode ${progress.e + 1}</a>`
    : '';

  return `<a class="back" href="/" data-link>← Home</a>
<div class="cover${cinema ? ' poster-art' : ''}">${cover}</div>
<div><h1 class="mtitle">${esc(movie.title)}</h1><p class="by">${esc(movie.credit)} · ${esc(movie.genre.name)} · ${movie.episodes.length} episodes · ~${movie.totalMinutes} min</p></div>
<div class="hbtns"><a class="btn" href="/m/${esc(movie.slug)}/1" data-link data-play data-fresh>Watch from the start</a>${resume}</div>
<p class="blurb">${esc(movie.synopsis)}</p>
<div><p class="sec">Cast</p></div><div class="cast">${cast}</div>
<div><p class="sec">Episodes</p></div>
<div class="eps">${episodes}</div>
<p class="note">Episodes play one after another. Keep your volume up.</p>`;
}

/** Player shell. The behaviour is attached by mountPlayer() in player.js. */
export function playerView(movie, n, episode, speechAvailable, rate, voiceLabel = 'Voice') {
  return `<div class="ptop"><a class="back" href="/m/${esc(movie.slug)}" data-link>← Episodes</a><div class="ptitle"><b>${esc(movie.title)}</b><span>Episode ${n}: ${esc(episode.title)}</span></div></div>
${
    movie.style === 'cinema'
      ? '<div class="stage cine" id="stage"><canvas aria-label="Animated 3D scene"></canvas><div class="ld" aria-live="polite">Preparing the scene…</div><div class="ng">The 3D picture is not available on this device. The story continues with voices and captions.</div></div>'
      : '<div class="stage" id="stage"><div class="layer on"></div><div class="layer"></div></div>'
  }
<div class="seglist" id="segs">${episode.scenes.map((_, i) => `<button class="sg" data-act="seek" data-i="${i}" aria-label="Scene ${i + 1}"></button>`).join('')}</div>
<div class="cap" id="cap" aria-live="off"></div>
<div class="ctl"><button class="rb" data-act="prev" aria-label="Previous line">${ICON.prev}</button><button class="play" id="pp" data-act="toggle" aria-label="Play or pause">${ICON.play}</button><button class="rb" data-act="next" aria-label="Next line">${ICON.next}</button><button class="spd" id="spd" data-act="speed" aria-label="Narration speed">${rate}x</button><button class="spd voice-btn" id="vbtn" data-act="voice" aria-label="Narrator voice" title="Change voice">${esc(voiceLabel)}</button></div>
${speechAvailable ? '' : '<p class="note">This browser has no speech voice, so lines advance on a timer with captions.</p>'}`;
}

export function errorView(message, retry = true) {
  return `<div class="errbox"><p>${esc(message)}</p><div class="row">${retry ? '<button class="btn" data-act="reload">Try again</button>' : ''}<a class="btn ghost" href="/" data-link>Back to Home</a></div></div>`;
}

/* ------------------------------------------------------------- admin views */

export function adminLoginView(error = '') {
  return `<div class="top">
  <a class="back" href="/" data-link>← Back to Site</a>
  <span class="tag">Operator Access</span>
</div>
<div class="admin-card">
  <h1 class="mtitle">Admin Login</h1>
  <p class="blurb" style="font-size:15px;">Enter your <code>ADMIN_API_KEY</code> to manage movies, import new story JSON files, or change publishing status.</p>
  ${error ? `<div class="admin-alert error" role="alert"><p>${esc(error)}</p></div>` : ''}
  <form id="admin-login-form" class="admin-form">
    <div class="field">
      <label for="admin-key-input">Admin API Key</label>
      <input type="password" id="admin-key-input" name="key" placeholder="Enter ADMIN_API_KEY" autocomplete="current-password" required autofocus>
    </div>
    <div class="row">
      <button type="submit" class="btn" style="min-height:44px;min-width:120px;">Log In</button>
      <button type="button" class="btn ghost" id="use-default-key-btn" style="min-height:44px;">Use Default Key</button>
    </div>
  </form>
  <p class="note" style="margin-top:12px;">Default key in <code>.env</code>: <code id="default-key-val">cinebox-admin-2026</code></p>
</div>`;
}

export function adminDashboardView(movies) {
  const publishedCount = movies.filter((m) => m.published).length;
  const draftCount = movies.length - publishedCount;
  const totalMinutes = movies.reduce((sum, m) => sum + (m.minutes || 0), 0);

  const rows = movies.length === 0
    ? `<div class="empty" style="padding:24px 0;"><p>No movies in the database yet. Import one below!</p></div>`
    : movies.map((m) => `
    <div class="admin-movie-row" data-slug="${esc(m.slug)}">
      <div class="admin-movie-info">
        <div class="admin-movie-header">
          <b>${esc(m.title)}</b>
          <span class="chip ${m.published ? 'chip-pub' : 'chip-draft'}">${m.published ? 'Published' : 'Draft'}</span>
          ${m.featured ? '<span class="chip chip-feat">Featured</span>' : ''}
        </div>
        <p class="admin-movie-meta">${esc(m.genre)} · ${m.episodes} ${m.episodes === 1 ? 'ep' : 'eps'} · ~${m.minutes} min · <code>${esc(m.slug)}</code></p>
      </div>
      <div class="admin-movie-actions">
        <a class="btn ghost small-btn" href="/m/${esc(m.slug)}" data-link target="_blank" rel="noopener">View</a>
        <button class="btn ghost small-btn" data-act="toggle-pub" data-slug="${esc(m.slug)}" data-next="${!m.published}">${m.published ? 'Unpublish' : 'Publish'}</button>
        <button class="btn ghost small-btn btn-danger" data-act="delete-movie" data-slug="${esc(m.slug)}" data-title="${esc(m.title)}">Delete</button>
      </div>
    </div>`).join('');

  return `<div class="top">
  <a class="back" href="/" data-link>← Back to Site</a>
  <div class="row" style="align-items:center;">
    <span class="tag">Operator Dashboard</span>
    <button class="btn ghost small-btn" id="admin-logout-btn" style="min-height:36px;">Log Out</button>
  </div>
</div>

<div class="admin-header">
  <h1 class="mtitle">Movie Management</h1>
  <div class="admin-stats">
    <div class="stat-box"><b>${movies.length}</b><span>Total Movies</span></div>
    <div class="stat-box"><b>${publishedCount}</b><span>Published</span></div>
    <div class="stat-box"><b>${draftCount}</b><span>Drafts</span></div>
    <div class="stat-box"><b>~${totalMinutes}m</b><span>Duration</span></div>
  </div>
</div>

<div class="admin-card">
  <div class="admin-card-head">
    <h2 style="font:400 22px/1.2 var(--display);">Import Movie</h2>
    <span class="note">Validates and compiles automatically</span>
  </div>
  <p class="note">Select a movie JSON file (from <code>seed/movies/</code> or your own authoring file) to import or replace by slug.</p>
  <div id="import-feedback" style="display:none;"></div>
  <form id="admin-import-form" class="admin-form">
    <div class="drop-zone" id="drop-zone">
      <input type="file" id="movie-file-input" accept=".json,application/json" class="file-input">
      <p><b>Choose a JSON movie file</b> or drag it here</p>
      <span class="note" id="file-chosen-name">No file chosen</span>
    </div>
    <div class="row" style="margin-top:4px;">
      <button type="submit" id="import-btn" class="btn" style="min-height:44px;" disabled>Validate &amp; Import</button>
      <button type="button" id="toggle-json-paste" class="btn ghost" style="min-height:44px;">Paste JSON Instead</button>
    </div>
    <div id="paste-box" style="display:none;margin-top:10px;">
      <textarea id="json-paste-input" rows="8" placeholder="Paste your movie JSON file content here..." class="json-textarea"></textarea>
      <button type="button" id="import-paste-btn" class="btn" style="margin-top:8px;min-height:44px;">Import Pasted JSON</button>
    </div>
  </form>
</div>

<div class="admin-card">
  <div class="admin-card-head">
    <h2 style="font:400 22px/1.2 var(--display);">Movies in Database</h2>
    <button class="btn ghost small-btn" id="refresh-movies-btn" style="min-height:36px;">Refresh</button>
  </div>
  <div class="admin-movie-list" id="admin-movie-list">
    ${rows}
  </div>
</div>`;
}

