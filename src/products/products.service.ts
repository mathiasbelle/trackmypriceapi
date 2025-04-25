import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create.product.dto';
import { UpdateProductDto } from './dto/update.product.dto';
import { DatabaseService } from 'src/database/database.service';
import { QueryResult } from 'pg';
import { FindOneProductDto } from './dto/find.one.product.dto';
import { FindByUserUidDto } from './dto/find.by.user.uid.dto';
import { ScraperService } from 'src/scraper/scraper.service';

@Injectable()
export class ProductsService {
    private readonly logger = new Logger(ProductsService.name);
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly scraperService: ScraperService,
    ) {}

    /**
     * Creates a new product.
     *
     * @param createProductDto the data for the product to be created
     *
     * @throws BadRequestException if the product data can't be scraped
     * @throws InternalServerErrorException if there's a problem with the database
     */
    async create(createProductDto: CreateProductDto): Promise<QueryResult[]> {
        try {
            const rowCount = await this.databaseService.executeQuery(
                'SELECT COUNT(*) FROM products WHERE user_uid = $1',
                [createProductDto.user_uid],
            );

            if (rowCount.rows[0].count >= 15) {
                throw new BadRequestException(
                    'You have reached the maximum number of products.',
                );
            }

            const scrapedData = await this.scraperService.scrapePrice(
                createProductDto.url,
            );

            if (!scrapedData?.name || scrapedData.price == null) {
                throw new BadRequestException('Failed to get product data.');
            }

            const { name, price } = scrapedData;

            const result = await this.databaseService.executeQuery(
                'INSERT INTO products (name, current_price, url, user_uid, user_email) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [
                    name,
                    price,
                    createProductDto.url,
                    createProductDto.user_uid,
                    createProductDto.user_email,
                ],
            );

            return result.rows;
        } catch (error) {
            this.logger.error(`Error creating product: ${error}`);

            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new InternalServerErrorException(
                'Error when creating product.',
            );
        }
    }

    /**
     * Gets all products in the database.
     *
     * @returns A promise that resolves to an array of products in the database.
     *
     * @throws InternalServerErrorException if there's a problem with the database.
     */
    async findAll(): Promise<QueryResult[]> {
        try {
            const result = await this.databaseService.executeQuery(
                'SELECT * FROM products',
            );

            return result.rows;
        } catch (error) {
            throw new InternalServerErrorException(
                'Error when getting products.',
            );
        }
    }

    /**
     * Retrieves a product by its ID.
     *
     * @param data - The data transfer object containing the product ID.
     * @returns A promise that resolves to an array of products matching the given ID.
     * @throws NotFoundException if no product is found with the given ID.
     */

    async findOne(data: FindOneProductDto): Promise<QueryResult[]> {
        const { id } = data;

        const result = await this.databaseService.executeQuery(
            'SELECT * FROM products WHERE id = $1',
            [id],
        );

        if (!result || result.rowCount === 0) {
            throw new NotFoundException(`Product with ID ${id} not found.`);
        }

        return result.rows;
    }

    /**
     * Retrieves all products associated with a specific user UID.
     *
     * @param data - The data transfer object containing the user UID.
     * @returns A promise that resolves to an array of products associated with the given user UID.
     */

    async findByUserUid(data: FindByUserUidDto): Promise<QueryResult[]> {
        const { user_uid } = data;

        const result = await this.databaseService.executeQuery(
            'SELECT * FROM products WHERE user_uid = $1',
            [user_uid],
        );

        return result.rows;
    }

    /**
     * Updates a product by its ID.
     *
     * @param id - The ID of the product to be updated.
     * @param updateProductDto - The data transfer object containing the data to be updated.
     * @returns A promise that resolves to the updated product.
     * @throws InternalServerErrorException if there's a problem with the database.
     */
    async update(
        id: number,
        updateProductDto: UpdateProductDto,
    ): Promise<QueryResult[]> {
        let queryParams = '';
        let paramIndex = 1;
        let values = [];

        if (updateProductDto.current_price) {
            queryParams += `current_price = $${paramIndex++}`;
            values.push(updateProductDto.current_price);
        }
        if (updateProductDto.last_checked_at) {
            if (queryParams) queryParams += ', ';
            queryParams += `last_checked_at = $${paramIndex++}`;
            values.push(updateProductDto.last_checked_at);
        }
        if (!queryParams) {
            return [];
        }
        values.push(id);

        try {
            const result = await this.databaseService.executeQuery(
                `UPDATE products SET ${queryParams} WHERE id = $${paramIndex} RETURNING *`,
                values,
            );

            return result.rows;
        } catch (error) {
            this.logger.error(`Error updating product: ${error}`);
            throw new InternalServerErrorException(
                'Error when updating product.',
            );
        }
    }

    /**
     * Removes a product from the database by its ID.
     *
     * @param id - The ID of the product to be removed.
     * @returns A promise that resolves to an empty array.
     * @throws NotFoundException if no product is found with the given ID.
     */

    async remove(id: number): Promise<QueryResult[]> {
        const result = await this.databaseService.executeQuery(
            'DELETE FROM products WHERE id = $1',
            [id],
        );

        if (!result || result.rowCount === 0) {
            throw new NotFoundException(`Product with ID ${id} not found.`);
        }

        return result.rows;
    }

    /**
     * Removes all products from the database that belong to a given user.
     *
     * @param user_uid - The user's unique identifier.
     * @returns A promise that resolves to an empty array.
     */
    async removeAllByUserUid(user_uid: string): Promise<QueryResult[]> {
        const result = await this.databaseService.executeQuery(
            'DELETE FROM products WHERE user_uid = $1',
            [user_uid],
        );
        return result.rows;
    }
}
