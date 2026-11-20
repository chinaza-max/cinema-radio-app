import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from './app.factory';

/** Vercel entry. The Nest app (and its MongoDB connection) is created once per warm function instance and reused. */
let ready: Promise<(req: IncomingMessage, res: ServerResponse) => void> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  ready ??= (async () => {
    const app = await createApp();
    await app.init();
    return app.getHttpAdapter().getInstance();
  })().catch((err) => {
    ready = undefined; // do not cache a failed start (for example a wrong MONGODB_URI)
    throw err;
  });
  return (await ready)(req, res);
}
