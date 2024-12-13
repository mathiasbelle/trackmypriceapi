import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseService.name);

    constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

    async executeQuery(query: string, params?: any[]): Promise<any[]> {
        this.logger.debug(`Executing query: ${query} ${params}`);
        const res: QueryResult = await this.pool.query(query, params);
        this.logger.debug(`Query result: ${res}`);
        return res.rows;
    }

    async onModuleInit() {
        await this.checkAndCreateTables();
    }

    private async checkAndCreateTables() {
        const client = await this.pool.connect();
        try {
            this.logger.log('Checking and creating tables...');

            await client.query(`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              email VARCHAR(255) NOT NULL UNIQUE,
              password VARCHAR(255) NOT NULL,
              created_at TIMESTAMPTZ DEFAULT NOW()
            );
          `);

            await client.query(`
            CREATE TABLE IF NOT EXISTS products (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              price NUMERIC(10, 2) NOT NULL,
              url TEXT NOT NULL,
              user_id INTEGER NOT NULL REFERENCES users(id),
              created_at TIMESTAMPTZ DEFAULT NOW()
            );
          `);

            this.logger.log('Tables checked and created.');
        } catch (error) {
            this.logger.error('Error when checking and creating tables', error);
        } finally {
            client.release();
        }
    }
}
