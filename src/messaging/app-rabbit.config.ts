import { RabbitConfig } from '../generated/messaging/rabbitmq/rabbit-config';
import { env } from '../configuration/environment';

export class AppRabbitConfig extends RabbitConfig {
  constructor() {
    super({
      exchange: env.RABBITMQ_EXCHANGE,
      url: env.RABBITMQ_URL,
      requeueOnError: env.RABBITMQ_REQUEUE_ON_ERROR
    });
  }
}

export const rabbit = new AppRabbitConfig();
