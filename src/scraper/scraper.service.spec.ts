import { Test, TestingModule } from '@nestjs/testing';
import { ScraperService } from './scraper.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

describe('ScraperService', () => {
    let service: ScraperService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [HttpModule, ConfigModule],
            providers: [ScraperService],
        }).compile();

        service = module.get<ScraperService>(ScraperService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('scrapeAmazonProduct', () => {
        it('should scrape product name and price correctly', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => ({
                    first: () => ({
                        textContent: () => {
                            if (selector === '#productTitle')
                                return Promise.resolve('  Test Product  ');
                            if (selector === '.a-price-whole')
                                return Promise.resolve('1.234,');
                            if (selector === '.a-price-fraction')
                                return Promise.resolve('56');
                            return Promise.resolve(null);
                        },
                    }),
                })),
                close: jest.fn(),
            };

            const result = await service.scrapeAmazonProduct(mockPage as any);

            expect(result).toEqual({
                name: 'Test Product',
                price: 1234.56,
            });

            expect(mockPage.close).toHaveBeenCalled();
        });

        it('should throw an error if product name is not found', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => ({
                    first: () => ({
                        textContent: () => {
                            if (selector === '#productTitle')
                                return Promise.resolve(null);
                            return Promise.resolve('123');
                        },
                    }),
                })),
                close: jest.fn(),
            };

            await expect(
                service.scrapeAmazonProduct(mockPage as any),
            ).rejects.toThrow('Could not scrape Amazon product');

            expect(mockPage.close).toHaveBeenCalled();
        });

        it('should throw an error if price is incomplete', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => ({
                    first: () => ({
                        textContent: () => {
                            if (selector === '#productTitle')
                                return Promise.resolve('Product');
                            if (selector === '.a-price-whole')
                                return Promise.resolve(null);
                            return Promise.resolve('56');
                        },
                    }),
                })),
                close: jest.fn(),
            };

            await expect(
                service.scrapeAmazonProduct(mockPage as any),
            ).rejects.toThrow('Could not scrape Amazon product');

            expect(mockPage.close).toHaveBeenCalled();
        });

        it('should throw an error if price is invalid', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => ({
                    first: () => ({
                        textContent: () => {
                            if (selector === '#productTitle')
                                return Promise.resolve('Product');
                            if (selector === '.a-price-whole')
                                return Promise.resolve('invalid');
                            if (selector === '.a-price-fraction')
                                return Promise.resolve('xx');
                            return Promise.resolve(null);
                        },
                    }),
                })),
                close: jest.fn(),
            };

            await expect(
                service.scrapeAmazonProduct(mockPage as any),
            ).rejects.toThrow('Could not scrape Amazon product');

            expect(mockPage.close).toHaveBeenCalled();
        });
    });

    describe('scrapeMercadoLivreProduct', () => {
        it('should scrape product name and price correctly', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => {
                    return {
                        textContent: () => {
                            if (selector === '.ui-pdp-title')
                                return Promise.resolve(
                                    '  Mercado Livre Product  ',
                                );
                            return Promise.resolve(null);
                        },
                        getAttribute: (attr: string) => {
                            if (
                                selector === 'meta[itemprop="price"]' &&
                                attr === 'content'
                            ) {
                                return Promise.resolve('1499.90');
                            }
                            return Promise.resolve(null);
                        },
                    };
                }),
                close: jest.fn(),
            };

            const result = await service.scrapeMercadoLivreProduct(
                mockPage as any,
            );

            expect(result).toEqual({
                name: 'Mercado Livre Product',
                price: 1499.9,
            });

            expect(mockPage.close).toHaveBeenCalled();
        });

        it('should throw an error if product name is not found', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => ({
                    textContent: () =>
                        selector === '.ui-pdp-title'
                            ? Promise.resolve(null)
                            : Promise.resolve('...'),
                    getAttribute: () => Promise.resolve('1499.90'),
                })),
                close: jest.fn(),
            };

            await expect(
                service.scrapeMercadoLivreProduct(mockPage as any),
            ).rejects.toThrow('Could not scrape Mercado Livre product');

            expect(mockPage.close).toHaveBeenCalled();
        });

        it('should throw an error if product price is not found', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => ({
                    textContent: () => Promise.resolve('Product'),
                    getAttribute: () => Promise.resolve(null),
                })),
                close: jest.fn(),
            };

            await expect(
                service.scrapeMercadoLivreProduct(mockPage as any),
            ).rejects.toThrow('Could not scrape Mercado Livre product');

            expect(mockPage.close).toHaveBeenCalled();
        });

        it('should throw an error if product price is invalid', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => ({
                    textContent: () => Promise.resolve('Product'),
                    getAttribute: () => Promise.resolve('invalid'),
                })),
                close: jest.fn(),
            };

            await expect(
                service.scrapeMercadoLivreProduct(mockPage as any),
            ).rejects.toThrow('Could not scrape Mercado Livre product');

            expect(mockPage.close).toHaveBeenCalled();
        });
    });

    describe('scrapeOLXProduct', () => {
        it('should scrape product name and price correctly', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => {
                    return {
                        first: () => ({
                            textContent: () => {
                                if (selector.includes('title-medium'))
                                    return Promise.resolve('  OLX Product  ');
                                if (selector.includes('title-large'))
                                    return Promise.resolve('R$ 2.300,99');
                                return Promise.resolve(null);
                            },
                        }),
                    };
                }),
                close: jest.fn(),
            };

            const result = await service.scrapeOLXProduct(mockPage as any);

            expect(result).toEqual({
                name: 'OLX Product',
                price: 2300.99,
            });

            expect(mockPage.close).toHaveBeenCalled();
        });

        it('should throw an error if product name is not found', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => ({
                    first: () => ({
                        textContent: () =>
                            selector.includes('title-medium')
                                ? Promise.resolve(null)
                                : Promise.resolve('R$ 2.300,99'),
                    }),
                })),
                close: jest.fn(),
            };

            await expect(
                service.scrapeOLXProduct(mockPage as any),
            ).rejects.toThrow('Product name not found');

            expect(mockPage.close).toHaveBeenCalled();
        });

        it('should throw an error if product price is not found', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => ({
                    first: () => ({
                        textContent: () =>
                            selector.includes('title-medium')
                                ? Promise.resolve('OLX Product')
                                : Promise.resolve(null),
                    }),
                })),
                close: jest.fn(),
            };

            await expect(
                service.scrapeOLXProduct(mockPage as any),
            ).rejects.toThrow('Product price not found');

            expect(mockPage.close).toHaveBeenCalled();
        });

        it('should throw an error if product price is invalid', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => ({
                    first: () => ({
                        textContent: () =>
                            selector.includes('title-medium')
                                ? Promise.resolve('OLX Product')
                                : Promise.resolve('invalid price'),
                    }),
                })),
                close: jest.fn(),
            };

            await expect(
                service.scrapeOLXProduct(mockPage as any),
            ).rejects.toThrow('Failed to parse product price');

            expect(mockPage.close).toHaveBeenCalled();
        });
    });

    describe('scrapeMagazineLuizaProduct', () => {
        it('should scrape product name and price correctly', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => {
                    if (
                        selector === 'h1[data-testid="heading-product-title"]'
                    ) {
                        return {
                            first: () => ({
                                textContent: () =>
                                    Promise.resolve('  Magazine Product  '),
                            }),
                        };
                    }
                    if (selector === '[data-testid="price-value"]') {
                        return {
                            first: () => ({
                                textContent: () =>
                                    Promise.resolve('ou R$ 3.499,99'),
                            }),
                        };
                    }
                }),
                close: jest.fn(),
            };

            const result = await service.scrapeMagazineLuizaProduct(
                mockPage as any,
            );

            expect(result).toEqual({
                name: 'Magazine Product',
                price: 3499.99,
            });

            expect(mockPage.close).toHaveBeenCalled();
        });

        it('should throw an error if product name is not found', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => {
                    if (
                        selector === 'h1[data-testid="heading-product-title"]'
                    ) {
                        return {
                            first: () => ({
                                textContent: () => Promise.resolve(null),
                            }),
                        };
                    }
                    return {
                        first: () => ({
                            textContent: () => Promise.resolve('R$ 3499,99'),
                        }),
                    };
                }),
                close: jest.fn(),
            };

            await expect(
                service.scrapeMagazineLuizaProduct(mockPage as any),
            ).rejects.toThrow('Product name not found');

            expect(mockPage.close).toHaveBeenCalled();
        });

        it('should throw an error if product price is not found', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => {
                    if (
                        selector === 'h1[data-testid="heading-product-title"]'
                    ) {
                        return {
                            first: () => ({
                                textContent: () => Promise.resolve('Product'),
                            }),
                        };
                    }
                    return {
                        first: () => ({
                            textContent: () => Promise.resolve(''),
                        }),
                    };
                }),
                close: jest.fn(),
            };

            await expect(
                service.scrapeMagazineLuizaProduct(mockPage as any),
            ).rejects.toThrow('Product price not found');

            expect(mockPage.close).toHaveBeenCalled();
        });

        it('should throw an error if price string cannot be parsed', async () => {
            const mockPage = {
                locator: jest.fn().mockImplementation((selector: string) => {
                    if (
                        selector === 'h1[data-testid="heading-product-title"]'
                    ) {
                        return {
                            first: () => ({
                                textContent: () => Promise.resolve('Product'),
                            }),
                        };
                    }
                    return {
                        first: () => ({
                            textContent: () => Promise.resolve('R$ abc,99'),
                        }),
                    };
                }),
                close: jest.fn(),
            };

            await expect(
                service.scrapeMagazineLuizaProduct(mockPage as any),
            ).rejects.toThrow('Failed to parse product price');

            expect(mockPage.close).toHaveBeenCalled();
        });
    });
});
