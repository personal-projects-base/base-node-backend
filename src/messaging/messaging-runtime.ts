import { rabbit } from './app-rabbit.config';

export async function startMessaging(): Promise<void> {
  if (process.env.RABBITMQ_ENABLED === 'true') await rabbit.connect();
}

export async function stopMessaging(): Promise<void> {
  await rabbit.close();
}
