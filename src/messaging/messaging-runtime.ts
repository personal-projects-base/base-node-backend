import { rabbit } from './app-rabbit.config';
import { env } from '../configuration/environment';

export async function startMessaging(): Promise<void> {
  if (env.RABBITMQ_ENABLED) await rabbit.connect();
}

export async function stopMessaging(): Promise<void> {
  await rabbit.close();
}
