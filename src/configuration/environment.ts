import 'dotenv/config';
import { z } from 'zod';

function booleanValue(defaultValue: boolean) {
  return z.preprocess(value => {
    if (value === undefined || value === '') return defaultValue;
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  }, z.boolean());
}

function integerValue(defaultValue: number, minimum: number, maximum = Number.MAX_SAFE_INTEGER) {
  return z.preprocess(value => {
    if (value === undefined || value === '') return defaultValue;
    return typeof value === 'number' ? value : Number(value);
  }, z.number().int().min(minimum).max(maximum));
}

function optionalString() {
  return z.preprocess(
    value => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().min(1).optional()
  );
}

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().min(1).default('base-node-backend'),
  APP_DISPLAY_NAME: z.string().min(1).default('Base Node Backend'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: integerValue(3000, 1, 65_535),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
    .default('info'),
  REQUEST_LOG_ENABLED: booleanValue(true),
  HELMET_ENABLED: booleanValue(true),
  CORS_ENABLED: booleanValue(true),
  CORS_ORIGINS: z.string()
    .default('http://localhost:4200,http://localhost:5173')
    .transform(value => value.split(',').map(origin => origin.trim()).filter(Boolean))
    .refine(origins => origins.length > 0, 'Informe ao menos uma origem CORS.'),
  CORS_CREDENTIALS: booleanValue(false),
  RATE_LIMIT_ENABLED: booleanValue(true),
  RATE_LIMIT_WINDOW_MS: integerValue(60_000, 1),
  RATE_LIMIT_MAX: integerValue(100, 1),
  TRUST_PROXY_HOPS: integerValue(0, 0),
  DATABASE_URL: z.string().regex(
    /^(?:mongodb|postgres|postgresql):\/\//i,
    'Use uma URL MongoDB ou PostgreSQL válida.'
  ),
  PRISMA_DEPLOY_MODE: z.enum(['push', 'migrate', 'none']).default('push'),
  POSTGRES_NATIVE_ENABLED: booleanValue(false),
  POSTGRES_URL: optionalString(),
  POSTGRES_POOL_MAX: integerValue(10, 1),
  MONGODB_ENABLED: booleanValue(false),
  MONGODB_URL: optionalString(),
  MONGODB_DATABASE: z.string().min(1).default('base_node'),
  MONGODB_MAX_POOL_SIZE: integerValue(10, 1),
  RABBITMQ_ENABLED: booleanValue(false),
  RABBITMQ_URL: optionalString(),
  RABBITMQ_EXCHANGE: z.string().min(1).default('base.node.events'),
  RABBITMQ_REQUEUE_ON_ERROR: booleanValue(false)
}).superRefine((value, context) => {
  if (value.CORS_CREDENTIALS && value.CORS_ORIGINS.includes('*')) {
    context.addIssue({
      code: 'custom',
      path: ['CORS_ORIGINS'],
      message: 'CORS_ORIGINS não pode usar * quando CORS_CREDENTIALS=true.'
    });
  }
  if (value.MONGODB_ENABLED && !value.MONGODB_URL) {
    context.addIssue({
      code: 'custom',
      path: ['MONGODB_URL'],
      message: 'MONGODB_URL é obrigatória quando MONGODB_ENABLED=true.'
    });
  }
  if (
    value.POSTGRES_NATIVE_ENABLED &&
    !value.POSTGRES_URL &&
    !/^postgres(?:ql)?:\/\//i.test(value.DATABASE_URL)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['POSTGRES_URL'],
      message: 'POSTGRES_URL é obrigatória quando o PostgreSQL nativo está habilitado.'
    });
  }
  if (value.RABBITMQ_ENABLED && !value.RABBITMQ_URL) {
    context.addIssue({
      code: 'custom',
      path: ['RABBITMQ_URL'],
      message: 'RABBITMQ_URL é obrigatória quando RABBITMQ_ENABLED=true.'
    });
  }
});

const parsedEnvironment = environmentSchema.safeParse(process.env);
if (!parsedEnvironment.success) {
  const details = parsedEnvironment.error.issues
    .map(issue => `${issue.path.join('.') || 'ambiente'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Configuração de ambiente inválida:\n${details}`);
}

export const env = Object.freeze(parsedEnvironment.data);
