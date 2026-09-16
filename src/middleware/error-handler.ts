import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler } from 'express';
import { logger } from '../configuration/logger';
import { CrudError } from '../generated/common/contracts';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Não foi possível concluir a operação.';

  if (error instanceof CrudError) {
    status = error.status;
    code = error.status === 404 ? 'NOT_FOUND' : 'INVALID_REQUEST';
    message = error.message;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const knownErrors: Record<string, [number, string, string]> = {
      P2002: [409, 'CONFLICT', 'Já existe um registro com esse valor único.'],
      P2003: [409, 'RELATION_CONFLICT', 'A operação viola um relacionamento.'],
      P2025: [404, 'NOT_FOUND', 'Registro não encontrado.']
    };
    [status, code, message] = knownErrors[error.code] ?? [status, code, message];
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    [status, code, message] = [400, 'INVALID_REQUEST', 'Dados da requisição inválidos.'];
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    [status, code, message] = [503, 'DATABASE_UNAVAILABLE', 'Banco de dados indisponível.'];
  } else if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.parse.failed') {
      [status, code, message] = [400, 'INVALID_JSON', 'JSON inválido.'];
    } else if (error.type === 'entity.too.large') {
      [status, code, message] = [413, 'PAYLOAD_TOO_LARGE', 'Corpo da requisição excede 1 MB.'];
    }
  }

  const requestId = response.locals.requestId as string | undefined;
  if (status >= 500) {
    logger.error({ err: error, requestId, status, code }, 'Request failed');
  } else {
    logger.warn({ requestId, status, code }, 'Request rejected');
  }
  response.status(status).json({ error: { code, message } });
};
