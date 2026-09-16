import pino from 'pino';
import { env } from './environment';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: env.APP_NAME,
    environment: env.NODE_ENV
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password',
      '*.password',
      'token',
      '*.token',
      'accessToken',
      'refreshToken',
      'authorization',
      'cookie',
      'headers.authorization',
      'headers.cookie',
      'req.headers.authorization',
      'req.headers.cookie'
    ],
    censor: '[REDACTED]'
  }
});
