import cors from 'cors';
import type { Express } from 'express';
import helmet from 'helmet';
import { env } from '../configuration/environment';

export function registerSecurityMiddleware(app: Express): void {
  if (env.HELMET_ENABLED) {
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:']
        }
      }
    }));
  }

  if (env.CORS_ENABLED) {
    app.use(cors({
      origin: env.CORS_ORIGINS,
      credentials: env.CORS_CREDENTIALS,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
      maxAge: 86_400
    }));
  }
}
