import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { join } from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Runs against a real MongoDB.
 *  - Default: mongodb-memory-server starts a throwaway mongod (downloads the binary on first run, then caches it).
 *  - Or set TEST_MONGODB_URI to use your own server. The database it names MUST be disposable and its name must
 *    contain "test": it is dropped when the tests finish. Example: mongodb://127.0.0.1:27017/cinebox-test
 */
process.env.ADMIN_API_KEY = 'test-key';
process.env.SEED_ON_BOOT = 'true';

const seed = (name: string) => JSON.parse(readFileSync(join(__dirname, '..', 'seed', 'movies', name), 'utf8'));

describe('Cinebox (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  let memory: MongoMemoryServer | undefined;
  let external = false;

  beforeAll(async () => {
    let uri = process.env.TEST_MONGODB_URI;
    if (uri) {
      external = true;
      if (!/test/i.test(new URL(uri).pathname)) throw new Error('TEST_MONGODB_URI must name a database containing "test"');
    } else {
      memory = await MongoMemoryServer.create();
      uri = memory.getUri('cinebox-test');
    }
    process.env.MONGODB_URI = uri;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }, 180_000);

  afterAll(async () => {
    if (external) await app.get<Connection>(getConnectionToken()).dropDatabase();
    await app.close();
    await memory?.stop();
  });

  it('seeds the demo movies and groups them by genre', async () => {
    const res = await http().get('/api/catalog').expect(200);
    const names = res.body.genres.map((g: any) => g.name);
    expect(names).toEqual(expect.arrayContaining(['Fantasy', 'Mystery', 'Adventure', 'Science fiction']));
    const fantasy = res.body.genres.find((g: any) => g.name === 'Fantasy');
    expect(fantasy.movies.map((m: any) => m.slug).sort()).toEqual(['magic-base', 'the-ember-crown']);
    expect(res.body.featured.slug).toBe('magic-base');
    // the catalog must stay light: no scenes, no full cast
    expect(JSON.stringify(res.body)).not.toContain('"scenes"');
  });

  it('renders the home page on the server with genres and poster titles', async () => {
    const res = await http().get('/').expect(200);
    expect(res.text).toContain('<section class="genre" aria-label="Fantasy">');
    expect(res.text).toContain('Magic Base');
    expect(res.text).toContain('id="boot"');
    expect(res.headers.etag).toBeDefined();
    await http().get('/').set('If-None-Match', res.headers.etag).expect(304);
  });

  it('serves the home fragment and the app shell', async () => {
    const frag = await http().get('/?fragment=1').expect(200);
    expect(frag.text).not.toContain('<html');
    expect(frag.text).toContain('class="hero"');
    const shell = await http().get('/m/magic-base/2').expect(200);
    expect(shell.text).toContain('<main class="wrap" id="app">');
    const adminShell = await http().get('/admin').expect(200);
    expect(adminShell.text).toContain('<main class="wrap" id="app">');
  });

  it('lists storytelling voices', async () => {
    const res = await http().get('/api/audio/voices').expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('name');
  });

  it('serves movie details without scenes, and episodes with scenes (1-based)', async () => {
    const movie = await http().get('/api/movies/magic-base').expect(200);
    expect(movie.body.episodes).toHaveLength(5);
    expect(movie.body.episodes[0]).toEqual({ n: 1, title: 'The Last Light', sceneCount: 7, minutes: expect.any(Number) });
    expect(JSON.stringify(movie.body)).not.toContain('"scenes"');

    const ep = await http().get('/api/movies/magic-base/episodes/1').expect(200);
    expect(ep.body.scenes).toHaveLength(7);
    expect(ep.body.scenes[0]).toMatchObject({ s: 'N', p: 'moor', tm: 'dawn', cam: 'in', fl: 0 });
    expect(ep.body.scenes[1].pr).toEqual(['base', 'village']); // inherited from scene 1

    // Mongo reads one embedded episode with $slice: check a middle one comes back whole and correct.
    const third = await http().get('/api/movies/magic-base/episodes/3').expect(200);
    expect(third.body.title).toBe('The Hall of Echoes');
    expect(third.body.n).toBe(3);
    expect(third.body.scenes.length).toBeGreaterThan(3);
    await http().get('/api/movies/magic-base/episodes/5').expect(200);
    await http().get('/api/movies/magic-base/episodes/6').expect(404);
    await http().get('/api/movies/magic-base/episodes/9').expect(404);
    await http().get('/api/movies/nope').expect(404);
  });

  describe('admin API', () => {
    it('is closed without the right key', async () => {
      await http().post('/api/admin/movies').send({}).expect(401);
      await http().post('/api/admin/movies').set('x-api-key', 'wrong').send({}).expect(401);
    });

    it('rejects an invalid movie with a list of issues', async () => {
      const bad = seed('magic-base.json');
      bad.slug = 'broken';
      bad.episodes[0].scenes[1].place = 'desert';
      const res = await http().post('/api/admin/movies').set('x-api-key', 'test-key').send(bad).expect(400);
      expect(res.body.issues.join('\n')).toMatch(/unknown place "desert"/);
      await http().get('/api/movies/broken').expect(404);
    });

    it('imports a new movie in a new genre, which then appears in its own row', async () => {
      const movie = seed('treasure-island.json');
      movie.slug = 'test-western';
      movie.title = 'Test Western';
      movie.genre = 'Western';
      const res = await http().post('/api/admin/movies').set('x-api-key', 'test-key').send(movie).expect(201);
      expect(res.body).toMatchObject({ slug: 'test-western', replaced: false, genre: 'Western' });

      const catalog = await http().get('/api/catalog').expect(200);
      const western = catalog.body.genres.find((g: any) => g.name === 'Western');
      expect(western.movies.map((m: any) => m.slug)).toEqual(['test-western']);
      const home = await http().get('/').expect(200);
      expect(home.text).toContain('aria-label="Western"');
    });

    it('creates one genre row when two movies in a new genre are imported at the same time', async () => {
      const make = (slug: string) => {
        const m = seed('treasure-island.json');
        m.slug = slug;
        m.title = slug;
        m.genre = 'Folklore';
        return m;
      };
      const [a, b] = await Promise.all(
        ['race-one', 'race-two'].map((slug) => http().post('/api/admin/movies').set('x-api-key', 'test-key').send(make(slug))),
      );
      expect([a.status, b.status]).toEqual([201, 201]);
      const genres = await http().get('/api/genres').expect(200);
      expect(genres.body.filter((g: any) => g.slug === 'folklore')).toHaveLength(1);
      const catalog = await http().get('/api/catalog').expect(200);
      const row = catalog.body.genres.find((g: any) => g.slug === 'folklore');
      expect(row.movies.map((m: any) => m.slug).sort()).toEqual(['race-one', 'race-two']);
      await http().delete('/api/admin/movies/race-one').set('x-api-key', 'test-key').expect(200);
      await http().delete('/api/admin/movies/race-two').set('x-api-key', 'test-key').expect(200);
    });

    it('replaces a movie with the same slug', async () => {
      const movie = seed('treasure-island.json');
      movie.slug = 'test-western';
      movie.title = 'Test Western Reloaded';
      movie.genre = 'Western';
      const res = await http().post('/api/admin/movies').set('x-api-key', 'test-key').send(movie).expect(201);
      expect(res.body.replaced).toBe(true);
      const detail = await http().get('/api/movies/test-western').expect(200);
      expect(detail.body.title).toBe('Test Western Reloaded');
    });

    it('hides a draft from the public API and shows it to the admin', async () => {
      await http().patch('/api/admin/movies/test-western/publish').set('x-api-key', 'test-key').send({ published: false }).expect(200);
      await http().get('/api/movies/test-western').expect(404);
      const catalog = await http().get('/api/catalog').expect(200);
      expect(catalog.body.genres.map((g: any) => g.name)).not.toContain('Western');
      const list = await http().get('/api/admin/movies').set('x-api-key', 'test-key').expect(200);
      expect(list.body.find((m: any) => m.slug === 'test-western')).toMatchObject({ published: false });
    });

    it('deletes a movie', async () => {
      await http().delete('/api/admin/movies/test-western').set('x-api-key', 'test-key').expect(200);
      await http().delete('/api/admin/movies/test-western').set('x-api-key', 'test-key').expect(404);
    });
  });

  it('exposes the vocabulary for movie authors', async () => {
    const res = await http().get('/api/vocabulary').expect(200);
    expect(res.body.places).toContain('moor');
    expect(res.body.fx).toContain('fog');
  });
});
