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
import { Browser, Page } from 'playwright';

@Injectable()
export class ScraperService {
    private readonly logger = new Logger(ScraperService.name);
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {}

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

    async getBrowserInstance(): Promise<Browser> {
        try {
            chromium.use(StealthPlugin());
            return chromium.launch({ headless: true });
        } catch (error) {
            this.logger.error(error.message);
            throw new InternalServerErrorException(
                'Could not get browser instance',
            );
        }
    }

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
                priceString.replace(/R\$ ?/, '').replace(',', '.'),
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
                    .evaluate((el) => {
                        return Array.from(el.childNodes)
                            .filter((node) => node.nodeType === Node.TEXT_NODE)
                            .map((node) => node.textContent.trim())
                            .join('');
                    }),
            ]);
            console.log(priceString);

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
                    .replace(/R\$\s?/, '')
                    .replace('.', '')
                    .replace(',', '.'),
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

            console.log(name, price);
            return { name, price };
        } catch (error) {
            throw new Error('Could not scrape Time product');
        }
    }

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

    async getPage(browser: Browser, url: string): Promise<Page> {
        const page = await browser.newPage();
        const response = await page.goto(url);
        if (!response.ok()) {
            await page.close();
            throw new BadRequestException(
                `Error fetching: ${url}. Status: ${response.status()}`,
            );
        }
        return page;
    }

    async scrapePrice(url: string, browser?: Browser): Promise<ProductInfo> {
        const hostname = getDomainWithoutSuffix(url);

        if (hostname && hostname in this.scrapers) {
            //const $ = await this.fetchPageHtml(url);
            if (!browser) {
                browser = await this.getBrowserInstance();
            }
            return this.scrapers[hostname](await this.getPage(browser, url));
        }

        throw new BadRequestException(`Invalid domain ${hostname}`);
    }
}
