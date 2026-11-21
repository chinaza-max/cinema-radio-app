import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import { join } from 'path';
import { AppModule } from './app.module';
import { PUBLIC_DIR, ROOT_DIR } from './config/paths';

/** Creates the app with all middleware. Shared by the long-running server (main.ts) and Vercel (serverless.ts). */
export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.disable('x-powered-by');
  app.use(compression()); // gzip for HTML, JSON, JS, CSS. Add Brotli at your reverse proxy or CDN.
  app.useBodyParser('json', { limit: '2mb' }); // movie files are posted as JSON
  // The 3D character files rarely change and are the heaviest download, so browsers may keep them for a week.
  app.useStaticAssets(join(PUBLIC_DIR, 'models'), { index: false, maxAge: '7d', etag: true, prefix: '/models/' });
  // Static files (css, js). index:false so "/" is rendered by WebController, not served from disk.
  app.useStaticAssets(PUBLIC_DIR, { index: false, maxAge: '1h', etag: true });
  // three.js is served from node_modules so it is never copied into the repo. Only the parts the browser imports are exposed.
  // (On Vercel the build copies these into public/vendor/three instead, so the CDN serves them: scripts/vendor-three.mjs.)
  const three = join(ROOT_DIR, 'node_modules', 'three');
  const vendor = { index: false, maxAge: '30d', immutable: true, etag: true } as const;
  app.useStaticAssets(join(three, 'build'), { ...vendor, prefix: '/vendor/three/build/' });
  app.useStaticAssets(join(three, 'examples', 'jsm'), { ...vendor, prefix: '/vendor/three/examples/jsm/' });
  return app;
}
