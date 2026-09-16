import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './configuration/environment';
import { logger } from './configuration/logger';
import { database } from './configuration/database/app-database.config';
import { startDataStores, stopDataStores } from './configuration/database/database-runtime';
import { startMessaging, stopMessaging } from './messaging/messaging-runtime';

async function main() {
  const { PORT: port, HOST: host } = env;

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
  logger.info({ host, port }, 'API started');

  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    logger.info('Shutting down API');

    const timeout = setTimeout(() => process.exit(1), 10_000);
    timeout.unref();
    server.close(async error => {
      try {
        await stopMessaging();
        await stopDataStores();
        if (error) process.exitCode = 1;
      } catch (shutdownError) {
        logger.error({ err: shutdownError }, 'Failed to stop resources');
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
  logger.fatal({ err: error }, 'Failed to start API');
  process.exitCode = 1;
  await stopMessaging().catch(() => undefined);
  await stopDataStores().catch(() => undefined);
});
