import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { DatabaseService } from '../database/database.service';
import { ScraperService } from '../scraper/scraper.service';
import {
    BadRequestException,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { UpdateProductDto } from './dto/update.product.dto';
import { productMock, productMock2 } from 'src/mocks/product.mock';

describe('ProductsService', () => {
    let service: ProductsService;
    let databaseService: DatabaseService;
    let scraperService: ScraperService;

    const mockDatabaseService = {
        executeQuery: jest.fn(),
    };

    const mockScraperService = {
        scrapePrice: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductsService,
                { provide: DatabaseService, useValue: mockDatabaseService },
                { provide: ScraperService, useValue: mockScraperService },
            ],
        }).compile();

        service = module.get<ProductsService>(ProductsService);
        databaseService = module.get<DatabaseService>(DatabaseService);
        scraperService = module.get<ScraperService>(ScraperService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should throw BadRequestException if user has 15 or more products', async () => {
            mockDatabaseService.executeQuery.mockResolvedValueOnce({
                rows: [{ count: 15 }],
            });

            await expect(service.create(productMock)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw BadRequestException if scrapePrice returns invalid data', async () => {
            mockDatabaseService.executeQuery.mockResolvedValueOnce({
                rows: [{ count: 5 }],
            });

            mockScraperService.scrapePrice.mockResolvedValueOnce({
                name: null,
                price: null,
            });

            await expect(service.create(productMock)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should return inserted product if everything goes well', async () => {
            mockDatabaseService.executeQuery
                .mockResolvedValueOnce({ rows: [{ count: 5 }] })
                .mockResolvedValueOnce({
                    rows: [productMock],
                });

            mockScraperService.scrapePrice.mockResolvedValueOnce({
                name: productMock.name,
                price: productMock.price,
            });

            const result = await service.create(productMock);
            expect(result).toEqual([productMock]);
            expect(mockDatabaseService.executeQuery).toHaveBeenCalledTimes(2);
            expect(mockScraperService.scrapePrice).toHaveBeenCalledWith(
                productMock.url,
            );
        });

        it('should throw InternalServerErrorException on unknown error', async () => {
            mockDatabaseService.executeQuery.mockRejectedValueOnce(
                new InternalServerErrorException(),
            );

            await expect(service.create(productMock)).rejects.toThrow(
                InternalServerErrorException,
            );
        });
    });

    describe('findAll', () => {
        it('should return all products from the database', async () => {
            const mockProducts = [productMock, productMock2];

            mockDatabaseService.executeQuery.mockResolvedValueOnce({
                rows: mockProducts,
            });

            const result = await service.findAll();
            expect(result).toEqual(mockProducts);
            expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
                'SELECT * FROM products',
            );
        });

        it('should throw InternalServerErrorException on error', async () => {
            mockDatabaseService.executeQuery.mockRejectedValueOnce(
                new InternalServerErrorException(
                    `Error when executing query: SELECT * FROM products`,
                ),
            );

            await expect(service.findAll()).rejects.toThrow(
                InternalServerErrorException,
            );
        });
    });

    describe('findOne', () => {
        it('should return the product if it exists', async () => {
            const id = 1;

            mockDatabaseService.executeQuery.mockResolvedValueOnce({
                rowCount: 1,
                rows: [productMock],
            });

            const result = await service.findOne({ id });
            expect(result).toEqual([productMock]);
            expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
                'SELECT * FROM products WHERE id = $1',
                [id],
            );
        });

        it('should throw NotFoundException if no product is found', async () => {
            const id = 999;

            mockDatabaseService.executeQuery.mockResolvedValueOnce({
                rowCount: 0,
                rows: [],
            });

            await expect(service.findOne({ id })).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw NotFoundException if result is null or undefined', async () => {
            const id = 123;

            mockDatabaseService.executeQuery.mockResolvedValueOnce(undefined);

            await expect(service.findOne({ id })).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('findByUserUid', () => {
        it('should return products for a specific user UID', async () => {
            const mockProducts = [productMock, productMock2];

            mockDatabaseService.executeQuery.mockResolvedValueOnce({
                rows: mockProducts,
            });

            const result = await service.findByUserUid({ user_uid: '123' });
            expect(result).toEqual(mockProducts);
            expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
                'SELECT * FROM products WHERE user_uid = $1',
                ['123'],
            );
        });

        it('should throw InternalServerErrorException on error', async () => {
            mockDatabaseService.executeQuery.mockRejectedValueOnce(
                new InternalServerErrorException(
                    `Error when executing query: SELECT * FROM products WHERE user_uid = $1`,
                ),
            );

            await expect(
                service.findByUserUid({ user_uid: '123' }),
            ).rejects.toThrow(InternalServerErrorException);
        });
    });

    describe('update', () => {
        it('should update only current_price', async () => {
            const updateDto: UpdateProductDto = { current_price: 50.99 };

            const expectedQuery =
                'UPDATE products SET current_price = $1 WHERE id = $2 RETURNING *';
            const expectedValues = [50.99, productMock.id];
            const mockResult = { rows: [{ ...productMock, ...updateDto }] };

            mockDatabaseService.executeQuery.mockResolvedValueOnce(mockResult);

            const result = await service.update(productMock.id, updateDto);
            expect(result).toEqual(mockResult.rows);
            expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
                expectedQuery,
                expectedValues,
            );
        });

        it('should update only last_checked_at', async () => {
            const updateDto = { last_checked_at: new Date().toISOString() };

            const expectedQuery =
                'UPDATE products SET last_checked_at = $1 WHERE id = $2 RETURNING *';
            const expectedValues = [updateDto.last_checked_at, productMock.id];
            const mockResult = {
                rows: [
                    {
                        ...productMock,
                        last_checked_at: updateDto.last_checked_at,
                    },
                ],
            };

            mockDatabaseService.executeQuery.mockResolvedValueOnce(mockResult);

            const result = await service.update(productMock.id, updateDto);
            expect(result).toEqual(mockResult.rows);
            expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
                expectedQuery,
                expectedValues,
            );
        });

        it('should update both current_price and last_checked_at', async () => {
            const updateDto = {
                current_price: 99.99,
                last_checked_at: '2025-04-14T15:00:00Z',
            };

            const expectedQuery =
                'UPDATE products SET current_price = $1, last_checked_at = $2 WHERE id = $3 RETURNING *';
            const expectedValues = [
                updateDto.current_price,
                updateDto.last_checked_at,
                productMock.id,
            ];
            const mockResult = { rows: [{ ...productMock, ...updateDto }] };

            mockDatabaseService.executeQuery.mockResolvedValueOnce(mockResult);

            const result = await service.update(productMock.id, updateDto);
            expect(result).toEqual(mockResult.rows);
            expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
                expectedQuery,
                expectedValues,
            );
        });

        it('should return an empty array if no fields are provided', async () => {
            const updateDto = {};

            const result = await service.update(productMock.id, updateDto);
            expect(result).toEqual([]);
            expect(mockDatabaseService.executeQuery).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException on query failure', async () => {
            const updateDto = { current_price: 49.99 };

            mockDatabaseService.executeQuery.mockRejectedValueOnce(
                new InternalServerErrorException(),
            );

            await expect(
                service.update(productMock.id, updateDto),
            ).rejects.toThrow(InternalServerErrorException);
        });
    });

    describe('remove', () => {
        it('should delete a product and return its data', async () => {
            mockDatabaseService.executeQuery.mockResolvedValueOnce({
                rowCount: 1,
                rows: [],
            });

            const result = await service.remove(productMock.id);
            expect(result).toEqual([productMock]);
            expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
                'DELETE FROM products WHERE id = $1',
                [productMock.id],
            );
        });

        it('should throw NotFoundException if no product was deleted (rowCount = 0)', async () => {
            mockDatabaseService.executeQuery.mockResolvedValueOnce({
                rowCount: 0,
                rows: [],
            });

            await expect(service.remove(productMock.id)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw NotFoundException if result is undefined or null', async () => {
            mockDatabaseService.executeQuery.mockResolvedValueOnce(
                undefined as any,
            );

            await expect(service.remove(productMock.id)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('removeAllByUserUid', () => {
        it('should delete all products by user_uid and return deleted rows', async () => {
            const mockDeletedProducts = [productMock, productMock2];

            mockDatabaseService.executeQuery.mockResolvedValueOnce({
                rows: mockDeletedProducts,
            });

            const result = await service.removeAllByUserUid(
                productMock.user_uid,
            );
            expect(result).toEqual(mockDeletedProducts);
            expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
                'DELETE FROM products WHERE user_uid = $1',
                [productMock.user_uid],
            );
        });
    });
});
