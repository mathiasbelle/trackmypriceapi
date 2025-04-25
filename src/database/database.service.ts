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

    /**
     * Executes a SQL query using the database connection pool.
     *
     * @param query - The SQL query string to be executed.
     * @param params - Optional array of parameters to pass with the query.
     * @returns A promise that resolves to the result of the query.
     * @throws InternalServerErrorException if the query execution fails.
     */

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

    /**
     * Initializes the database service by checking and creating the necessary
     * tables if they don't already exist.
     *
     * This function is called automatically by Nest when the module is
     * initialized.
     */
    async onModuleInit() {
        await this.checkAndCreateTables();
    }

    /**
     * Checks and creates the necessary tables in the database if they don't
     * already exist. This function is called automatically when the module
     * is initialized.
     *
     * The following tables are created if they don't already exist:
     *
     * - products
     *
     * The function also creates a trigger that updates the updated_at column
     * when the products table is updated.
     */
    private async checkAndCreateTables() {
        const client = await this.pool.connect();
        try {
            this.logger.log('Checking and creating tables...');

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
            try {
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
            } catch (error) {
                if (error.code === '42710') {
                    this.logger.warn('Trigger already exists');
                } else {
                    this.logger.error(
                        'Error when creating trigger',
                        error.message,
                    );
                }
            }

            this.logger.log('Tables checked and created.');
        } catch (error) {
            this.logger.error('Error when checking and creating tables', error);
        } finally {
            client.release();
        }
    }
}
