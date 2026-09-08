import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app';
import { database } from './configuration/database/app-database.config';
import { startDataStores, stopDataStores } from './configuration/database/database-runtime';
import { startMessaging, stopMessaging } from './messaging/messaging-runtime';

function resolvePort(): number {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT deve ser um inteiro entre 1 e 65535.');
  }
  return port;
}

async function main() {
  const port = resolvePort();
  const host = process.env.HOST ?? '127.0.0.1';

  await startDataStores();
  await startMessaging();

  const server = createServer(createApp(database.client));
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
  console.info(`API disponível em http://${host}:${port}`);

  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    console.info('Encerrando API...');

    const timeout = setTimeout(() => process.exit(1), 10_000);
    timeout.unref();
    server.close(async error => {
      try {
        await stopMessaging();
        await stopDataStores();
        if (error) process.exitCode = 1;
      } catch (shutdownError) {
        console.error('Falha ao encerrar recursos:', shutdownError);
        process.exitCode = 1;
      } finally {
        clearTimeout(timeout);
      }
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch(async error => {
  console.error('Falha ao iniciar API:', error);
  process.exitCode = 1;
  await stopMessaging().catch(() => undefined);
  await stopDataStores().catch(() => undefined);
});
