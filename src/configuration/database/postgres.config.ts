import { Pool, type PoolConfig } from 'pg';

export abstract class PostgresConfig {
  protected poolInstance?: Pool;

  protected resolveConnectionString(): string {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) throw new Error('DATABASE_URL deve ser configurada.');
    return connectionString;
  }

  protected createOptions(): PoolConfig {
    const max = Number(process.env.POSTGRES_POOL_MAX ?? 10);
    return {
      connectionString: this.resolveConnectionString(),
      max: Number.isInteger(max) && max > 0 ? max : 10
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
