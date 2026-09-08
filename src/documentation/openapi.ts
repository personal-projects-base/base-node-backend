import { generatedOpenApiDocument } from '../generated/documentation/openapi';

const healthPath = {
  get: {
    tags: ['Health'],
    summary: 'Verificar o processo HTTP',
    operationId: 'getHealth',
    responses: {
      '200': {
        description: 'API disponível',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: { status: { type: 'string', example: 'ok' } }
            }
          }
        }
      }
    }
  }
} as const;

// Personalize somente o que pertence à aplicação; CRUD e contratos vêm do Gonthera.
export const openApiDocument = {
  ...generatedOpenApiDocument,
  info: {
    ...generatedOpenApiDocument.info,
    title: 'Base Node Backend'
  },
  tags: [{ name: 'Health' }, ...generatedOpenApiDocument.tags],
  paths: {
    '/health': healthPath,
    ...generatedOpenApiDocument.paths
  }
};
