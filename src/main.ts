import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import { AppModule } from './app.module';
import { join } from 'path';
import { PUBLIC_DIR, ROOT_DIR } from './config/paths';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.disable('x-powered-by');
  app.use(compression()); // gzip for HTML, JSON, JS, CSS. Add Brotli at your reverse proxy or CDN.
  app.useBodyParser('json', { limit: '2mb' }); // movie files are posted as JSON
  // Static files (css, js). index:false so "/" is rendered by WebController, not served from disk.
  app.useStaticAssets(PUBLIC_DIR, { index: false, maxAge: '1h', etag: true });
  // three.js is served from node_modules so it is never copied into the repo. Only the parts the browser imports are exposed.
  const three = join(ROOT_DIR, 'node_modules', 'three');
  const vendor = { index: false, maxAge: '30d', immutable: true, etag: true } as const;
  app.useStaticAssets(join(three, 'build'), { ...vendor, prefix: '/vendor/three/build/' });
  app.useStaticAssets(join(three, 'examples', 'jsm'), { ...vendor, prefix: '/vendor/three/examples/jsm/' });
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`Cinebox running on http://localhost:${port}`);
}

bootstrap();
