import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Protects /api/admin/*. Send the key in the `x-api-key` header.
 * If ADMIN_API_KEY is not set the admin API is switched off completely (403), which is the safe default.
 * This is a shared secret, good enough for one operator. Replace with real auth before adding user accounts.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('ADMIN_API_KEY');
    if (!expected) throw new ForbiddenException('Admin API is disabled. Set ADMIN_API_KEY to enable it.');
    const req = context.switchToHttp().getRequest<Request>();
    const given = req.header('x-api-key') ?? '';
    if (!timingSafeEqual(digest(given), digest(expected))) throw new UnauthorizedException('Invalid API key');
    return true;
  }
}
