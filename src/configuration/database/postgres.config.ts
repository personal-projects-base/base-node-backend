import { Pool, type PoolConfig } from 'pg';

export abstract class PostgresConfig {
  protected poolInstance?: Pool;

  protected resolveConnectionString(): string {
    const postgresUrl = process.env.POSTGRES_URL?.trim();
    if (postgresUrl) return postgresUrl;

    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (databaseUrl && /^postgres(?:ql)?:\/\//i.test(databaseUrl)) return databaseUrl;

    throw new Error(
      'POSTGRES_URL deve ser configurada quando DATABASE_URL não aponta para PostgreSQL.'
    );
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
