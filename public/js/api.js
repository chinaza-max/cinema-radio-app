/*
 * Thin client for the JSON API. Responses are cached in memory for the life of the page,
 * and in-flight requests are shared, so prefetching the next episode never costs a second request.
 */

const memo = new Map();

function get(url) {
  if (!memo.has(url)) {
    const promise = fetch(url, { headers: { accept: 'application/json' } })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'not-found' : `HTTP ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        memo.delete(url); // never cache failures
        throw err;
      });
    memo.set(url, promise);
  }
  return memo.get(url);
}

/** Cast, cover and episode list (no scenes). */
export const getMovie = (slug) => get(`/api/movies/${encodeURIComponent(slug)}`);

/** One episode with all scenes. n is 1-based. */
export const getEpisode = (slug, n) => get(`/api/movies/${encodeURIComponent(slug)}/episodes/${n}`);

/** Start loading an episode in the background. Errors are ignored. */
export const prefetchEpisode = (slug, n) => {
  getEpisode(slug, n).catch(() => {});
};

/** Home page markup, for navigating back to Home when the first page was not Home. */
export async function getHomeFragment() {
  const res = await fetch('/?fragment=1');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/* ------------------------------------------------------------- admin client */

export async function getAdminMovies(apiKey) {
  const res = await fetch('/api/admin/movies', {
    headers: { 'x-api-key': apiKey, accept: 'application/json' },
  });
  if (!res.ok) {
    const err = new Error(res.status === 401 || res.status === 403 ? 'auth-failed' : `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function importAdminMovie(apiKey, movieData) {
  const res = await fetch('/api/admin/movies', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(movieData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.issues = data.issues || [];
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function togglePublishMovie(apiKey, slug, published) {
  const res = await fetch(`/api/admin/movies/${encodeURIComponent(slug)}/publish`, {
    method: 'PATCH',
    headers: { 'x-api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ published }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteAdminMovie(apiKey, slug) {
  const res = await fetch(`/api/admin/movies/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: { 'x-api-key': apiKey, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

