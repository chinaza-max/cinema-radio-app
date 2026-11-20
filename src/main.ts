import { Logger } from '@nestjs/common';
import { createApp } from './app.factory';

async function bootstrap() {
  const app = await createApp();
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`Cinebox running on http://localhost:${port}`);
}

bootstrap();
