import { DatabaseConfig } from '../../generated/configuration/database/database.config';

// Sobrescreva resolveUrl, createOptions ou createClient quando precisar customizar o Prisma.
export class AppDatabaseConfig extends DatabaseConfig {}

export const database = new AppDatabaseConfig();
