import { Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';
import { ModuleRef } from '@nestjs/core';
import { readFileSync } from 'fs';

const databasePoolFactory = async (configService: ConfigService) => {
    const isProduction = configService.get('NODE_ENV') === 'production';
    const caPath = configService.get('POSTGRES_CA_PATH');

    const sslConfig =
        isProduction && caPath
            ? {
                  ssl: {
                      rejectUnauthorized: true,
                      ca: readFileSync(caPath).toString(),
                  },
              }
            : {};

    return new Pool({
        user: configService.get('POSTGRES_USER'),
        host: configService.get('POSTGRES_HOST'),
        database: configService.get('POSTGRES_DB'),
        password: configService.get('POSTGRES_PASSWORD'),
        port: configService.get('POSTGRES_PORT'),
        ...sslConfig,
    });
};

@Module({
    providers: [
        {
            provide: 'DATABASE_POOL',
            inject: [ConfigService],
            useFactory: databasePoolFactory,
        },
        DatabaseService,
    ],
    exports: [DatabaseService],
})
export class DatabaseModule implements OnApplicationShutdown {
    private readonly logger = new Logger(DatabaseModule.name);

    constructor(private readonly moduleRef: ModuleRef) {}

    async onApplicationShutdown(signal?: string): Promise<any> {
        this.logger.log(`Shutting down on signal ${signal}`);
        const pool = this.moduleRef.get('DATABASE_POOL') as Pool;
        return await pool.end();
    }
}
