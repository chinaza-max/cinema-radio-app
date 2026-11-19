import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Page, WebService } from './web.service';

const PAGE_CACHE = 'public, max-age=15, stale-while-revalidate=120';

/**
 * HTML routes. Everything under /api is JSON (see MoviesController and AdminController).
 *
 *   /                 home page, server-rendered
 *   /?fragment=1      just the home markup, for client-side navigation back to Home
 *   /m/:slug          movie page    (shell; the browser loads data from the API)
 *   /m/:slug/:ep      player        (shell; ep is 1-based)
 *   /admin            admin page    (shell; interactive management dashboard)
 */
@Controller()
export class WebController {
  constructor(private readonly web: WebService) {}

  @Get()
  async home(@Query('fragment') fragment: string | undefined, @Req() req: Request, @Res() res: Response) {
    const { home, fragment: frag } = await this.web.home();
    this.send(req, res, fragment ? frag : home);
  }

  @Get(['m/:slug', 'm/:slug/:ep', 'admin'])
  shell(@Req() req: Request, @Res() res: Response) {
    this.send(req, res, this.web.shell());
  }

  private send(req: Request, res: Response, page: Page) {
    res.setHeader('ETag', page.etag);
    res.setHeader('Cache-Control', PAGE_CACHE);
    res.setHeader('Vary', 'Accept-Encoding');
    if (req.headers['if-none-match'] === page.etag) {
      res.status(304).end();
      return;
    }
    res.type('html').send(page.html);
  }
}
