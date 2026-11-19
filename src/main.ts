import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import { AppModule } from './app.module';
import { PUBLIC_DIR } from './config/paths';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.disable('x-powered-by');
  app.use(compression()); // gzip for HTML, JSON, JS, CSS. Add Brotli at your reverse proxy or CDN.
  app.useBodyParser('json', { limit: '2mb' }); // movie files are posted as JSON
  // Static files (css, js). index:false so "/" is rendered by WebController, not served from disk.
  app.useStaticAssets(PUBLIC_DIR, { index: false, maxAge: '1h', etag: true });
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`Cinebox running on http://localhost:${port}`);
}

bootstrap();
