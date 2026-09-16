import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../configuration/environment';

export function createRateLimitMiddleware(): RequestHandler {
  if (!env.RATE_LIMIT_ENABLED) {
    return (_request, _response, next) => next();
  }

  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, response, _next, options) => {
      response.status(options.statusCode).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Limite de requisições excedido. Tente novamente mais tarde.'
        }
      });
    }
  });
}
