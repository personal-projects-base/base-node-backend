import { database } from './app-database.config';
import { env } from '../environment';
import { mongodb } from './mongodb.config';
import { postgres } from './postgres.config';

export async function startDataStores(): Promise<void> {
  await database.connect();
  if (env.POSTGRES_NATIVE_ENABLED) await postgres.connect();
  if (env.MONGODB_ENABLED) await mongodb.connect();
}

export async function stopDataStores(): Promise<void> {
  const results = await Promise.allSettled([
    mongodb.disconnect(),
    postgres.disconnect(),
    database.disconnect()
  ]);
  const failure = results.find(result => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
}
