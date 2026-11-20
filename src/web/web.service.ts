import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { esc, jsonForScript } from '../common/html';
import { VIEWS_DIR } from '../config/paths';
import { Catalog, CatalogSnapshot, MoviesService, MovieSummary } from '../movies/movies.service';

export interface Page {
  html: string;
  etag: string;
}

const etagOf = (html: string) => `W/"${createHash('sha1').update(html).digest('hex').slice(0, 16)}"`;
const minutes = (m: { totalMinutes: number }) => `~${m.totalMinutes} min`;

/**
 * Server-side rendering for the home page. The browser gets finished HTML (hero, genre rows, poster titles)
 * on the first response, so it paints before any JavaScript runs. Poster artwork is drawn afterwards by
 * public/js/app.js when each poster scrolls into view.
 *
 * Pages are built once per catalog change and cached with an ETag.
 */
@Injectable()
export class WebService {
  private readonly template = readFileSync(join(VIEWS_DIR, 'index.html'), 'utf8');
  private built?: { snap: CatalogSnapshot; home: Page; fragment: Page };
  private readonly shellPage: Page;

  constructor(private readonly movies: MoviesService) {
    this.shellPage = this.page('<div class="loading" role="status">Loading…</div>');
  }

  /** Full home page, and the same markup as a fragment (used when the browser navigates back to Home). */
  async home(): Promise<{ home: Page; fragment: Page }> {
    const snap = await this.movies.getSnapshot();
    if (this.built?.snap !== snap) {
      const fragmentHtml = this.renderHome(snap.catalog);
      this.built = {
        snap,
        home: this.page(fragmentHtml),
        fragment: { html: fragmentHtml, etag: etagOf(fragmentHtml) },
      };
    }
    return this.built;
  }

  /** Empty page for /m/... routes. The browser fills it in from the JSON API. */
  shell(): Page {
    return this.shellPage;
  }

  private page(appHtml: string): Page {
    const html = this.template.replace('<!--APP-->', () => appHtml);
    return { html, etag: etagOf(html) };
  }

  // ------------------------------------------------------------------ markup

  private poster(m: MovieSummary): string {
    return `<a class="poster" href="/m/${esc(m.slug)}" data-link>
  ${m.style === 'cinema' ? `<div class="pimg still">${m.poster ? `<img src="${esc(m.poster)}" alt="" width="300" height="450" loading="lazy" decoding="async">` : ''}</div>` : `<div class="pimg" data-art="${esc(m.slug)}"></div>`}
  <b>${esc(m.title)}</b>
  <span>${m.episodeCount} ${m.episodeCount === 1 ? 'episode' : 'episodes'} · ${minutes(m)}</span>
</a>`;
  }

  private renderHome(catalog: Catalog): string {
    const f = catalog.featured;
    const art: Record<string, { cover: MovieSummary['cover']; coverCast: MovieSummary['coverCast'] }> = {};
    for (const g of catalog.genres) for (const m of g.movies) if (m.style !== 'cinema') art[m.slug] = { cover: m.cover, coverCast: m.coverCast };
    if (f && f.style !== 'cinema') art[f.slug] = { cover: f.cover, coverCast: f.coverCast };

    const header = `<header class="top"><a class="logo" href="/" data-link>Cine<b>box</b></a><div class="row" style="align-items:center;gap:14px;"><a href="/admin" data-link class="note" style="color:var(--muted);font-weight:600;">Admin</a><span class="note">AI-written stories</span></div></header>`;

    if (!f) {
      return `${header}
<p class="empty">No movies yet.<br><br><a href="/admin" data-link class="btn" style="display:inline-block;">Open Admin Page</a><br><br>or import with <code>npm run movie:import -- path/to/movie.json</code> and refresh.</p>`;
    }

    const hero = `<section class="hero">
  ${f.style === 'cinema' ? `<div class="art">${f.poster ? `<img src="${esc(f.poster)}" alt="" fetchpriority="high" decoding="async">` : ''}</div>` : `<div class="art" data-art="${esc(f.slug)}"></div>`}
  <div class="hinfo">
    <span class="tag">Featured · ${esc(f.genre.name)}</span>
    <h2>${esc(f.title)}</h2>
    <div class="chips"><span class="chip">${f.episodeCount} ${f.episodeCount === 1 ? 'episode' : 'episodes'}</span><span class="chip">About ${f.totalMinutes} min</span><span class="chip">Beginning to end</span></div>
    <p>${esc(f.synopsis)}</p>
    <div class="hbtns"><a class="btn" href="/m/${esc(f.slug)}/1" data-link data-play data-fresh>Watch from the start</a><a class="btn ghost" href="/m/${esc(f.slug)}" data-link>Episodes</a></div>
  </div>
</section>`;

    const rows = catalog.genres
      .map(
        (g) => `<section class="genre" aria-label="${esc(g.name)}">
  <div class="sechead"><h2 class="sec">${esc(g.name)}</h2><span class="note">${g.movies.length} ${g.movies.length === 1 ? 'story' : 'stories'}</span></div>
  <div class="rail">${g.movies.map((m) => this.poster(m)).join('')}</div>
</section>`,
      )
      .join('\n');

    return `${header}
${hero}
<div id="resume"></div>
${rows}
<p class="foot">Stories are written by AI. The pictures are drawn live in your browser and change with every line. Narration uses your device's own voice, so it sounds different on different phones. · <a href="/admin" data-link style="color:var(--muted);text-decoration:underline;">Admin</a></p>
<script type="application/json" id="boot">${jsonForScript({ art })}</script>`;
  }
}
