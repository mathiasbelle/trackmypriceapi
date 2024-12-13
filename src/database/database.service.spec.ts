import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import { Pool } from 'pg';

describe('DatabaseService', () => {
    let service: DatabaseService;
    let mockPool: Partial<Pool>;

    beforeEach(async () => {
        mockPool = {
            query: jest.fn(),
            connect: jest.fn().mockResolvedValue({
                query: jest.fn(),
                release: jest.fn(),
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseService,
                {
                    provide: 'DATABASE_POOL',
                    useValue: mockPool,
                },
            ],
        }).compile();

        service = module.get<DatabaseService>(DatabaseService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should execute a query successfully', async () => {
        const query = 'SELECT * FROM users';
        const result = { rows: [{ id: 1, email: 'test@example.com' }] };

        mockPool.query = jest.fn().mockResolvedValue(result);

        const response = await service.executeQuery(query);
        expect(response).toEqual(result.rows);
        expect(mockPool.query).toHaveBeenCalledWith(query, undefined);
    });

    it('should create tables on module initialization', async () => {
        const mockClient = {
            query: jest.fn(),
            release: jest.fn(),
        };

        mockPool.connect = jest.fn().mockResolvedValue(mockClient);

        await service.onModuleInit();
        expect(mockClient.query).toHaveBeenCalledTimes(2);
        expect(mockClient.release).toHaveBeenCalled();
    });
});
