import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

function positiveIntegerFromEnvironment(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) return fallback;

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} deve ser um inteiro positivo.`);
  }
  return value;
}

export function createRateLimitMiddleware(): RequestHandler {
  if (process.env.RATE_LIMIT_ENABLED === 'false') {
    return (_request, _response, next) => next();
  }

  return rateLimit({
    windowMs: positiveIntegerFromEnvironment('RATE_LIMIT_WINDOW_MS', 60_000),
    limit: positiveIntegerFromEnvironment('RATE_LIMIT_MAX', 100),
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
