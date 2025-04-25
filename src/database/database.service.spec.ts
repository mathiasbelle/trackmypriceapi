import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import { InternalServerErrorException } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { productMock } from 'src/mocks/product.mock';

describe('DatabaseService', () => {
    let service: DatabaseService;
    let poolMock: Partial<Pool>;

    beforeEach(async () => {
        poolMock = {
            query: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseService,
                {
                    provide: 'DATABASE_POOL',
                    useValue: poolMock,
                },
            ],
        }).compile();

        service = module.get<DatabaseService>(DatabaseService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('executeQuery', () => {
        it('should execute query successfully', async () => {
            const expectedResult: QueryResult = {
                command: 'SELECT',
                rowCount: 1,
                oid: null,
                fields: [],
                rows: [productMock],
            };

            (poolMock.query as jest.Mock).mockResolvedValue(expectedResult);

            const result = await service.executeQuery(
                'SELECT * FROM users WHERE id = $1',
                [productMock.id],
            );

            expect(poolMock.query).toHaveBeenCalledWith(
                'SELECT * FROM users WHERE id = $1',
                [productMock.id],
            );
            expect(result).toEqual(expectedResult);
        });

        it('should throw InternalServerErrorException on query failure', async () => {
            (poolMock.query as jest.Mock).mockRejectedValue(
                new InternalServerErrorException(),
            );

            await expect(
                service.executeQuery('SELECT * FROM invalid_table'),
            ).rejects.toThrow(InternalServerErrorException);

            expect(poolMock.query).toHaveBeenCalledWith(
                'SELECT * FROM invalid_table',
                undefined,
            );
        });
    });
});
