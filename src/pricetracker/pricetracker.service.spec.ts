import { Test, TestingModule } from '@nestjs/testing';
import { PricetrackerService } from './pricetracker.service';
import { DatabaseService } from 'src/database/database.service';
import { ScraperService } from 'src/scraper/scraper.service';
import { MailerService } from 'src/mailer/mailer.service';
import { productMock, productMock2 } from 'src/mocks/product.mock';

describe('PricetrackerService', () => {
    let service: PricetrackerService;
    let databaseService: DatabaseService;
    let scraperService: ScraperService;
    let mailerService: MailerService;

    const mockDatabaseService = {
        executeQuery: jest.fn(),
    };

    const mockScraperService = {
        scrapePrice: jest.fn(),
    };

    const mockMailerService = {
        sendMailWithHTML: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PricetrackerService,
                { provide: DatabaseService, useValue: mockDatabaseService },
                { provide: ScraperService, useValue: mockScraperService },
                { provide: MailerService, useValue: mockMailerService },
            ],
        }).compile();

        service = module.get<PricetrackerService>(PricetrackerService);
        databaseService = module.get(DatabaseService);
        scraperService = module.get(ScraperService);
        mailerService = module.get(MailerService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getProductsToTrack', () => {
        it('should return products that need to be tracked', async () => {
            const mockResult = { rows: [productMock] };
            mockDatabaseService.executeQuery.mockResolvedValue(mockResult);

            const result = await service.getProductsToTrack();
            expect(result).toBe(mockResult);
            expect(databaseService.executeQuery).toHaveBeenCalledWith(
                `SELECT * FROM products WHERE last_checked_at < NOW() - INTERVAL '6 HOURS'`,
            );
        });
    });

    describe('trackProducts', () => {
        it('should update product price and send email if price drops', async () => {
            const products = [productMock];

            mockDatabaseService.executeQuery.mockResolvedValueOnce({
                rows: products,
            });

            mockScraperService.scrapePrice.mockResolvedValue({
                name: productMock.name,
                price: productMock.current_price - 10,
            });
            await service.trackProducts();

            expect(scraperService.scrapePrice).toHaveBeenCalledWith(
                productMock.url,
            );
            expect(databaseService.executeQuery).toHaveBeenCalledWith(
                `UPDATE products SET current_price = $1, last_checked_at = NOW() WHERE id = $2`,
                [productMock.current_price - 10, productMock.id],
            );
            expect(mailerService.sendMailWithHTML).toHaveBeenCalled();
        }, 20000);

        it('should not update price or send email if price has not dropped', async () => {
            const products = [productMock2];

            mockDatabaseService.executeQuery.mockResolvedValueOnce({
                rows: products,
            });

            mockScraperService.scrapePrice.mockResolvedValue({
                name: productMock2.name,
                price: productMock2.current_price,
            });

            await service.trackProducts();

            expect(databaseService.executeQuery).toHaveBeenCalledWith(
                `UPDATE products SET last_checked_at = NOW() WHERE id = $1`,
                [productMock2.id],
            );
            expect(mailerService.sendMailWithHTML).not.toHaveBeenCalled();
        }, 20000);
    });
});
