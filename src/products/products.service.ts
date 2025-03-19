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

    async findByUserUid(data: FindByUserUidDto): Promise<QueryResult[]> {
        const { user_uid } = data;

        const result = await this.databaseService.executeQuery(
            'SELECT * FROM products WHERE user_uid = $1',
            [user_uid],
        );

        if (!result || result.rowCount === 0) {
            throw new NotFoundException(
                `No products found for user ${user_uid}.`,
            );
        }

        return result.rows;
    }

    async update(
        id: number,
        updateProductDto: UpdateProductDto,
    ): Promise<QueryResult[]> {
        let queryParams = '';
        let paramIndex = 1;
        let values = [];

        if (updateProductDto.current_price) {
            queryParams += `current_price = $${paramIndex++} `;
            values.push(updateProductDto.current_price);
        }
        if (updateProductDto.last_checked_at) {
            if (queryParams) queryParams += ', ';
            queryParams += `last_checked_at = $${paramIndex++} `;
            values.push(updateProductDto.last_checked_at);
        }
        if (!queryParams) {
            return [];
        }
        values.push(id);

        try {
            const result = await this.databaseService.executeQuery(
                `UPDATE products SET ${queryParams} WHERE id = $${paramIndex}`,
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
}
