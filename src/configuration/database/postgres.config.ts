import { Pool, type PoolConfig } from 'pg';
import { env } from '../environment';

export abstract class PostgresConfig {
  protected poolInstance?: Pool;

  protected resolveConnectionString(): string {
    const postgresUrl = env.POSTGRES_URL;
    if (postgresUrl) return postgresUrl;

    const databaseUrl = env.DATABASE_URL;
    if (databaseUrl && /^postgres(?:ql)?:\/\//i.test(databaseUrl)) return databaseUrl;

    throw new Error(
      'POSTGRES_URL deve ser configurada quando DATABASE_URL não aponta para PostgreSQL.'
    );
  }

  protected createOptions(): PoolConfig {
    return {
      connectionString: this.resolveConnectionString(),
      max: env.POSTGRES_POOL_MAX
    };
  }

  protected createPool(): Pool {
    return new Pool(this.createOptions());
  }

  get client(): Pool {
    this.poolInstance ??= this.createPool();
    return this.poolInstance;
  }

  async connect(): Promise<void> {
    await this.client.query('SELECT 1');
  }

  async disconnect(): Promise<void> {
    if (this.poolInstance) await this.poolInstance.end();
    this.poolInstance = undefined;
  }
}

export class AppPostgresConfig extends PostgresConfig {}

export const postgres = new AppPostgresConfig();
