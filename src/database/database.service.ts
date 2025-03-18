import {
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseService.name);

    constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

    async executeQuery(query: string, params?: any[]): Promise<QueryResult> {
        this.logger.debug(
            `Executing query: ${query} with params ${JSON.stringify(params)}`,
        );
        try {
            const res: QueryResult = await this.pool.query(query, params);
            this.logger.debug(`Query result: ${JSON.stringify(res.rows)}`);
            return res;
        } catch (error) {
            throw new InternalServerErrorException(
                `Error when executing query: ${query}`,
            );
        }
    }

    async onModuleInit() {
        await this.checkAndCreateTables();
    }

    private async checkAndCreateTables() {
        const client = await this.pool.connect();
        try {
            this.logger.log('Checking and creating tables...');

            // try {
            //     await client.query(
            //         `CREATE TYPE user_role AS ENUM ('${Role.ADMIN}', '${Role.USER}');`,
            //     );
            // } catch (error) {
            //     if (error.code !== '42710') {
            //         // 42710: duplicate_object
            //         throw error;
            //     }
            // }

            //     await client.query(`
            //     CREATE TABLE IF NOT EXISTS users (
            //       id SERIAL PRIMARY KEY,
            //       role user_role NOT NULL DEFAULT '${Role.USER}',
            //       name VARCHAR(255) NOT NULL,
            //       email VARCHAR(255) NOT NULL UNIQUE,
            //       password VARCHAR(255) NOT NULL,
            //       created_at TIMESTAMPTZ DEFAULT NOW(),
            //       updated_at TIMESTAMPTZ DEFAULT NOW()
            //     );
            //   `);

            await client.query(`
            CREATE TABLE IF NOT EXISTS products (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              current_price NUMERIC(12, 2) NOT NULL,
              url TEXT NOT NULL,
              user_uid TEXT NOT NULL,
              user_email TEXT NOT NULL,
              last_checked_at TIMESTAMPTZ DEFAULT NOW(),
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
          `);

            await client.query(`
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER set_updated_at
                BEFORE UPDATE ON products
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
            `);

            this.logger.log('Tables checked and created.');
        } catch (error) {
            this.logger.error('Error when checking and creating tables', error);
        } finally {
            client.release();
        }
    }
}
