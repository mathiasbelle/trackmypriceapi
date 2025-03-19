import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { AxiosError } from 'axios';
import { ProductInfo } from 'src/interfaces/product.info';
import { getDomainWithoutSuffix } from 'tldts';

@Injectable()
export class ScraperService {
    private readonly logger = new Logger(ScraperService.name);
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {}

    private readonly scrapers: Record<
        string,
        ($: cheerio.Root) => Promise<ProductInfo>
    > = {
        amazon: this.scrapeAmazonProduct,
        mercadolivre: this.scrapeMercadoLivreProduct,
        relogioonline: this.scrapeTimeForTesting,
    };

    async scrapeAmazonProduct($: cheerio.Root): Promise<ProductInfo> {
        try {
            const name = $('#productTitle').first().text().trim();

            if (!name) {
                throw new Error('Product name not found');
            }

            const priceWhole = $('.a-price-whole')
                .first()
                .text()
                .trim()
                .replace(/[.]/g, '');
            const priceFraction = $('.a-price-fraction').first().text();

            if (!priceWhole || !priceFraction) {
                throw new Error('Product price not found or is incomplete');
            }

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

    async scrapeMercadoLivreProduct($: cheerio.Root): Promise<ProductInfo> {
        try {
            const name = $('.ui-pdp-title').text().trim();

            if (!name) {
                throw new Error('Product name not found');
            }

            const priceString = $('[itemprop="price"]').attr('content')?.trim();

            if (!priceString) {
                throw new Error('Product price not found');
            }

            const price = Number(priceString);

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

    async scrapeTimeForTesting($: cheerio.Root): Promise<ProductInfo> {
        try {
            const name = $('#lbl-title').text().trim();

            if (!name) {
                throw new Error('Product name not found');
            }

            const priceString = $('#lbl-time').text().trim();

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

    async scrapePrice(url: string): Promise<ProductInfo> {
        const hostname = getDomainWithoutSuffix(url);

        if (hostname && hostname in this.scrapers) {
            const $ = await this.fetchPageHtml(url);
            return await this.scrapers[hostname]($);
        }

        throw new BadRequestException(`Invalid domain ${hostname}`);
    }
}
