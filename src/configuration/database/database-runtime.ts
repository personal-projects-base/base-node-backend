import { database } from './app-database.config';
import { mongodb } from './mongodb.config';
import { postgres } from './postgres.config';

export async function startDataStores(): Promise<void> {
  await database.connect();
  if (process.env.POSTGRES_NATIVE_ENABLED === 'true') await postgres.connect();
  if (process.env.MONGODB_ENABLED === 'true') await mongodb.connect();
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
