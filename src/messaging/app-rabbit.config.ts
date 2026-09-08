import { RabbitConfig } from '../generated/messaging/rabbitmq/rabbit-config';

export class AppRabbitConfig extends RabbitConfig {
  constructor() {
    super({
      exchange: process.env.RABBITMQ_EXCHANGE ?? 'base.node.events',
      url: process.env.RABBITMQ_URL,
      requeueOnError: process.env.RABBITMQ_REQUEUE_ON_ERROR === 'true'
    });
  }
}

export const rabbit = new AppRabbitConfig();
