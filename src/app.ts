import express from 'express';
import type { PrismaClient } from '@prisma/client';
import swaggerUi from 'swagger-ui-express';
import { createGeneratedRoutes } from './generated/routes';
import { openApiDocument } from './documentation/openapi';
import { errorHandler } from './middleware/error-handler';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import { requestInterceptor } from './middleware/request-interceptor';
import { customRoutes } from './routes';

function configureTrustProxy(app: express.Express): void {
  const rawValue = process.env.TRUST_PROXY_HOPS?.trim();
  if (!rawValue || rawValue === '0') return;

  const hops = Number(rawValue);
  if (!Number.isInteger(hops) || hops < 0) {
    throw new Error('TRUST_PROXY_HOPS deve ser um inteiro maior ou igual a zero.');
  }
  app.set('trust proxy', hops);
}

export function createApp(prisma: PrismaClient) {
  const app = express();
  app.disable('x-powered-by');
  configureTrustProxy(app);

  // Toda requisição passa primeiro pelo interceptor e depois pelo rate limit.
  app.use(requestInterceptor);
  app.use(createRateLimitMiddleware());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.get('/openapi.json', (_request, response) => {
    response.json(openApiDocument);
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
    swaggerOptions: { validatorUrl: null },
    customSiteTitle: 'Base Node Backend'
  }));

  // Rotas específicas vêm antes das rotas geradas quando substituírem um caminho.
  app.use(customRoutes);
  app.use(createGeneratedRoutes(prisma));

  app.use((_request, response) => {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' }
    });
  });
  app.use(errorHandler);
  return app;
}
