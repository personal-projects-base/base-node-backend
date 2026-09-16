import express from 'express';
import type { PrismaClient } from '@prisma/client';
import swaggerUi from 'swagger-ui-express';
import { env } from './configuration/environment';
import { createGeneratedRoutes } from './generated/routes';
import { openApiDocument } from './documentation/openapi';
import { errorHandler } from './middleware/error-handler';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import { requestInterceptor } from './middleware/request-interceptor';
import { registerSecurityMiddleware } from './middleware/security';
import { customRoutes } from './routes';

function configureTrustProxy(app: express.Express): void {
  if (env.TRUST_PROXY_HOPS > 0) app.set('trust proxy', env.TRUST_PROXY_HOPS);
}

export function createApp(prisma: PrismaClient) {
  const app = express();
  app.disable('x-powered-by');
  configureTrustProxy(app);

  // Toda requisição passa primeiro pelo interceptor e depois pelo rate limit.
  app.use(requestInterceptor);
  registerSecurityMiddleware(app);
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
    customSiteTitle: env.APP_DISPLAY_NAME
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
