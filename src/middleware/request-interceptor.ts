import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function resolveRequestId(value: string | undefined): string {
  return value && REQUEST_ID_PATTERN.test(value) ? value : randomUUID();
}

export const requestInterceptor: RequestHandler = (request, response, next) => {
  const requestId = resolveRequestId(request.get('x-request-id'));
  const startedAt = process.hrtime.bigint();

  response.locals.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);

  response.once('finish', () => {
    if (process.env.REQUEST_LOG_ENABLED === 'false') return;

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.info(JSON.stringify({
      type: 'http_request',
      requestId,
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: request.ip
    }));
  });

  next();
};
