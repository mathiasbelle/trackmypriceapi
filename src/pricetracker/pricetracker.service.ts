import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { AxiosError } from 'axios';
import { ProductInfo } from 'src/interfaces/product.info';
import { getDomainWithoutSuffix } from 'tldts';
import { DatabaseService } from 'src/database/database.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScraperService } from 'src/scraper/scraper.service';
import { MailerService } from 'src/mailer/mailer.service';
import Decimal from 'decimal.js';
import { priceChangeEmailTemplate } from 'src/mailer/html.templates';
import { setTimeout } from 'timers/promises';

@Injectable()
export class PricetrackerService {
    private readonly logger = new Logger(PricetrackerService.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly scraperService: ScraperService,
        private readonly mailerService: MailerService,
    ) {}

    /**
     * Gets all products in the database that haven't been checked in the last 7 minutes.
     * @returns A promise that resolves to the result of the query.
     */
    getProductsToTrack() {
        return this.databaseService.executeQuery(
            `SELECT * FROM products WHERE last_checked_at < NOW() - INTERVAL '7 MINUTES'`,
        );
    }

    @Cron(CronExpression.EVERY_MINUTE)
    /**
     * Tracks the price of all products in the database, and sends an email if the price changes.
     *
     * This function is called every minute by the scheduler.
     *
     * @returns {Promise<void>}
     */
    async trackProducts() {
        const products = (await this.getProductsToTrack()).rows;
        const browser = await this.scraperService.getBrowserInstance();

        const results = await Promise.allSettled(
            products.map(async (product) => {
                try {
                    // Random delay between 1 and 7 seconds so that the requests don't all happen at the same time
                    await setTimeout(Math.floor(1000 + Math.random() * 6000));
                    const { name, price } =
                        await this.scraperService.scrapePrice(
                            product.url,
                            browser,
                        );
                    if (price < Number(product.current_price)) {
                        this.databaseService.executeQuery(
                            `UPDATE products SET current_price = $1, last_checked_at = NOW() WHERE id = $2`,
                            [price, product.id],
                        );

                        this.logger
                            .debug(`Original Product: ${product.name} - Price: ${product.current_price}
                                    New Product: ${name} - Price: ${price}\n`);
                        try {
                            this.mailerService.sendMailWithHTML(
                                product.user_email,
                                `Price change for one of your products: ${name}`,
                                priceChangeEmailTemplate(
                                    product.name,
                                    price,
                                    product.current_price,
                                    product.url,
                                ),
                            );
                        } catch (error) {
                            this.logger.error(
                                `Error sending email for product ID ${product.id}: ${error.message}`,
                            );
                        }
                    } else {
                        await this.databaseService.executeQuery(
                            `UPDATE products SET last_checked_at = NOW() WHERE id = $1`,
                            [product.id],
                        );
                    }
                } catch (error) {
                    if (error instanceof BadRequestException) {
                        this.logger.error(
                            `Error tracking product ID ${product.id}: ${error.message}`,
                        );
                    }
                }
            }),
        );

        this.logger.debug(
            `Tracking completed. Success: ${
                results.filter((r) => r.status === 'fulfilled').length
            }, Failed: ${
                results.filter((r) => r.status === 'rejected').length
            }`,
        );

        // for (const product of products) {
        //     try {
        //         const { name, price } = await this.scraperService.scrapePrice(
        //             product.url,
        //         );
        //         this.logger
        //             .debug(`Original Product: ${product.name} - Price: ${price}
        //         New Product: ${name} - Price: ${price}\n`);
        //         if (Number(product.current_price) !== price) {
        //             this.databaseService.executeQuery(
        //                 `UPDATE products SET current_price = $1, last_checked_at = NOW() WHERE id = $2`,
        //                 [price, product.id],
        //             );
        //             this.mailerService.sendMail(
        //                 product.user_email,
        //                 `Price change for one of your products: ${name}`,
        //                 `The price of ${product.name} has changed from ${
        //                     product.current_price
        //                 } to ${price}.
        //                 Thats a difference of ${Decimal.sub(
        //                     product.current_price,
        //                     price,
        //                 )}.
        //                 URL: ${product.url}`,
        //             );
        //         }
        //         await this.databaseService.executeQuery(
        //             `UPDATE products SET last_checked_at = NOW() WHERE id = $1`,
        //             [product.id],
        //         );
        //     } catch (error) {
        //         if (error instanceof BadRequestException) {
        //             this.logger.error(
        //                 `Error tracking product ID ${product.id}: ${error.message}`,
        //             );
        //         }
        //     }
        // }
    }
}
