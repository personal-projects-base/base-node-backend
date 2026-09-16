import { MongoClient, type MongoClientOptions } from 'mongodb';
import { env } from '../environment';

export abstract class MongoDatabaseConfig {
  protected clientInstance?: MongoClient;

  protected resolveUrl(): string {
    const url = env.MONGODB_URL;
    if (!url) throw new Error('MONGODB_URL deve ser configurada.');
    return url;
  }

  protected resolveDatabaseName(): string {
    return env.MONGODB_DATABASE;
  }

  protected createOptions(): MongoClientOptions {
    return { maxPoolSize: env.MONGODB_MAX_POOL_SIZE };
  }

  protected createClient(): MongoClient {
    return new MongoClient(this.resolveUrl(), this.createOptions());
  }

  get client(): MongoClient {
    this.clientInstance ??= this.createClient();
    return this.clientInstance;
  }

  get database() {
    return this.client.db(this.resolveDatabaseName());
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.database.command({ ping: 1 });
  }

  async disconnect(): Promise<void> {
    if (this.clientInstance) await this.clientInstance.close();
    this.clientInstance = undefined;
  }
}

export class AppMongoDatabaseConfig extends MongoDatabaseConfig {}

export const mongodb = new AppMongoDatabaseConfig();
