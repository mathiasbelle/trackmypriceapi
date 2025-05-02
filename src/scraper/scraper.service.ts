import { HttpService } from '@nestjs/axios';
import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { AxiosError } from 'axios';
import { ProductInfo } from 'src/interfaces/product.info';
import { getDomainWithoutSuffix } from 'tldts';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, BrowserContext, Page } from 'playwright';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from 'async-mutex';

@Injectable()
export class ScraperService {
    private readonly logger = new Logger(ScraperService.name);
    private initializeStealthPlugin = true;
    browser: Browser | null;
    broswerContext: BrowserContext | null;
    private isBrowserOpen = false;
    private browserMutex = new Mutex();

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        if (this.initializeStealthPlugin) {
            chromium.use(StealthPlugin());
            this.initializeStealthPlugin = false;
        }
    }

    private readonly scrapers: Record<
        string,
        (page: Page) => Promise<ProductInfo>
    > = {
        amazon: this.scrapeAmazonProduct,
        mercadolivre: this.scrapeMercadoLivreProduct,
        olx: this.scrapeOLXProduct,
        magazineluiza: this.scrapeMagazineLuizaProduct,
        relogioonline: this.scrapeTimeForTesting,
    };

    /**
     * Gets a headless instance of the chromium browser.
     *
     * @returns A promise that resolves to the browser instance.
     * @throws InternalServerErrorException if there's a problem with the browser.
     */
    async getBrowserInstance(): Promise<Browser> {
        try {
            return chromium.launch({ headless: true });
        } catch (error) {
            this.logger.error(error.message);
            throw new InternalServerErrorException(
                'Could not get browser instance',
            );
        }
    }

    /**
     * Scrapes the product title and price from an Amazon product page.
     *
     * @param page The page object of the Amazon product page.
     * @returns A promise that resolves to the product title and price.
     * @throws Error if the scraper fails to find the product title or price.
     */
    async scrapeAmazonProduct(page: Page): Promise<ProductInfo> {
        try {
            let [name, priceWhole, priceFraction] = await Promise.all([
                page.locator('#productTitle').first().textContent(),
                page.locator('.a-price-whole').first().textContent(),
                page.locator('.a-price-fraction').first().textContent(),
            ]);

            page.close();

            if (!name) {
                throw new Error('Product name not found');
            }

            name = name.trim();

            if (!priceWhole || !priceFraction) {
                throw new Error('Product price not found or is incomplete');
            }

            priceWhole = priceWhole.trim().replace(/[.]/g, '');

            priceFraction = priceFraction.trim();

            const price: number = Number(
                (priceWhole + priceFraction).replace(/[,]/g, '.'),
            );

            if (isNaN(price)) {
                throw new Error('Failed to parse product price');
            }
            //console.log(name);
            //console.log(price);
            return { name, price };
        } catch (error) {
            throw new Error('Could not scrape Amazon product');
        }
    }

    /**
     * Scrapes the product title and price from a Mercado Livre product page.
     *
     * @param page The page object of the Mercado Livre product page.
     * @returns A promise that resolves to the product title and price.
     * @throws Error if the scraper fails to find the product title or price.
     */
    async scrapeMercadoLivreProduct(page: Page): Promise<ProductInfo> {
        try {
            let [name, priceString] = await Promise.all([
                page.locator('.ui-pdp-title').textContent(),
                page.locator('meta[itemprop="price"]').getAttribute('content'),
            ]);

            page.close();

            if (!name) {
                throw new Error('Product name not found');
            }

            name = name.trim();

            if (!priceString) {
                throw new Error('Product price not found');
            }

            const price = Number(priceString.trim());

            if (isNaN(price)) {
                throw new Error('Failed to parse product price');
            }

            //console.log(name);
            //console.log(price);
            return { name, price };
        } catch (error) {
            throw new Error('Could not scrape Mercado Livre product');
        }
    }

    /**
     * Scrapes the product title and price from an OLX product page.
     *
     * @param page The page object of the OLX product page.
     * @returns A promise that resolves to the product title and price.
     * @throws Error if the scraper fails to find the product title or price.
     */
    async scrapeOLXProduct(page: Page): Promise<ProductInfo> {
        try {
            let [name, priceString] = await Promise.all([
                page
                    .locator(
                        '.olx-text.olx-text--title-medium.olx-text--block.ad__sc-1l883pa-2.bdcWAn',
                    )
                    .first()
                    .textContent(),
                page
                    .locator('.olx-text.olx-text--title-large.olx-text--block')
                    .first()
                    .textContent(),
            ]);

            page.close();

            if (!name) {
                throw new Error('Product name not found');
            }

            name = name.trim();

            if (!priceString) {
                throw new Error('Product price not found');
            }

            priceString = priceString.trim();

            const price = Number(
                priceString
                    .replace(/R\$ ?/, '')
                    .replace('.', '')
                    .replace(',', '.'),
            );

            if (isNaN(price)) {
                throw new Error('Failed to parse product price');
            }

            //console.log(name);
            //console.log(price);

            return { name, price };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Scrapes the product title and price from a Magazine Luiza product page.
     *
     * @param page The page object of the Magazine Luiza product page.
     * @returns A promise that resolves to an object containing the product title and price.
     * @throws Error if the scraper fails to find the product title or price,
     *         or if there's an error parsing the price.
     */

    async scrapeMagazineLuizaProduct(page: Page): Promise<ProductInfo> {
        try {
            let [name, priceString] = await Promise.all([
                page
                    .locator('h1[data-testid="heading-product-title"]')
                    .first()
                    .textContent(),
                page
                    .locator('[data-testid="price-value"]')
                    .first()
                    .textContent(),
            ]);

            page.close();

            if (!name) {
                throw new Error('Product name not found');
            }

            name = name.trim();

            if (!priceString) {
                throw new Error('Product price not found');
            }

            const price = Number(
                priceString
                    .replace('ou', '')
                    .replace(/R\$\s?/, '')
                    .replace('.', '')
                    .replace(',', '.')
                    .trim(),
            );

            if (isNaN(price)) {
                throw new Error('Failed to parse product price');
            }

            // console.log(name);
            // console.log(price);

            return { name, price };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Scrapes the product title and price from a page containing the current time, for testing purposes.
     *
     * @param page The page object of the Time for Testing product page.
     * @returns A promise that resolves to the product title and price.
     * @throws Error if the scraper fails to find the product title or price.
     */
    async scrapeTimeForTesting(page: Page): Promise<ProductInfo> {
        try {
            let [name, priceString] = await Promise.all([
                page.locator('#lbl-title').textContent(),
                page.locator('#lbl-time').textContent(),
            ]);

            page.close();

            if (!name) {
                throw new Error('Product name not found');
            }

            if (!priceString) {
                throw new Error('Product price not found');
            }

            const price = Number(priceString.slice(3).replace(/[:]/g, '.'));

            if (isNaN(price)) {
                throw new Error('Failed to parse product price');
            }

            // console.log(name, price);
            return { name, price };
        } catch (error) {
            throw new Error('Could not scrape Time product');
        }
    }

    /**
     * Fetches the HTML content of a page using the HTTP service.
     *
     * @param url The URL of the page to fetch.
     * @returns A promise that resolves to a Cheerio root element, representing the HTML content of the page.
     * @throws BadRequestException if the page cannot be fetched.
     */
    async fetchPageHtml(url: string): Promise<cheerio.Root> {
        try {
            const res = await lastValueFrom(
                this.httpService.get(url, {
                    headers: {
                        'User-Agent':
                            this.configService.get<string>('USER_AGENT'),
                    },
                    timeout: 10000,
                }),
            );

            if (!res.data) {
                throw new Error('Page returned no data');
            }

            return cheerio.load(res.data);
        } catch (error) {
            if (error instanceof AxiosError) {
                this.logger.error(
                    `Error fetching ${url}: ${error.response?.status}`,
                );
            } else {
                this.logger.error(`Unknown error fetching ${url}:`, error);
            }
            throw new BadRequestException(`Could not fetch: ${url}`);
        }
    }

    /**
     * Opens a new browser page and navigates to the given URL.
     *
     * @param url The URL to navigate to.
     * @returns A promise that resolves to the page object once the navigation is complete.
     * @throws BadRequestException if the navigation fails.
     */
    async getPage(url: string): Promise<Page> {
        const page = await this.broswerContext.newPage();
        const response = await page.goto(url);
        if (!response.ok()) {
            await page.close();
            throw new BadRequestException(
                `Error fetching: ${url}. Status: ${response.status()}`,
            );
        }
        return page;
    }

    /**
     * Scrapes the product information, including the title and price, from a given URL.
     *
     * @param url The URL of the product page to scrape.
     * @returns A promise that resolves to the product information, including name and price.
     * @throws BadRequestException if the URL domain is not supported.
     */
    async scrapePrice(url: string): Promise<ProductInfo> {
        const hostname = getDomainWithoutSuffix(url);

        if (!(hostname && hostname in this.scrapers)) {
            throw new BadRequestException(`Invalid domain ${hostname}`);
        }

        if (!this.browser || !this.broswerContext || !this.isBrowserOpen) {
            await this.browserMutex.runExclusive(async () => {
                this.browser = await chromium.launch({ headless: true });
                this.broswerContext = await this.browser.newContext();
                this.isBrowserOpen = true;
            });
        }
        return this.scrapers[hostname](await this.getPage(url));
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    /**
     * Closes the browser and all its pages. This function is idempotent, i.e. it
     * is safe to call it multiple times, even if the browser is already closed.
     *
     * @returns A promise that resolves when the browser is closed.
     */
    async closeBrowser(): Promise<void> {
        await this.browserMutex.runExclusive(async () => {
            try {
                this.logger.log('Closing browser...');
                if (
                    !this.browser ||
                    !this.broswerContext ||
                    !this.isBrowserOpen
                ) {
                    return;
                }
                const openPages = this.broswerContext.pages();
                if (openPages.length === 0) {
                    await this.broswerContext.close();
                    await this.browser.close();
                    this.logger.log('Closed the browser');
                    this.browser = null;
                    this.broswerContext = null;
                    this.isBrowserOpen = false;
                }
                return;
            } catch (error) {
                this.logger.error(`Error closing browser: ${error.message}`);
            }
        });
    }
}
