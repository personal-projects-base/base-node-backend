import { MongoClient, type MongoClientOptions } from 'mongodb';

export abstract class MongoDatabaseConfig {
  protected clientInstance?: MongoClient;

  protected resolveUrl(): string {
    const url = process.env.MONGODB_URL?.trim();
    if (!url) throw new Error('MONGODB_URL deve ser configurada.');
    return url;
  }

  protected resolveDatabaseName(): string {
    return process.env.MONGODB_DATABASE?.trim() || 'base_node';
  }

  protected createOptions(): MongoClientOptions {
    const maxPoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE ?? 10);
    return {
      maxPoolSize: Number.isInteger(maxPoolSize) && maxPoolSize > 0 ? maxPoolSize : 10
    };
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
