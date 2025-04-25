import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create.product.dto';
import { UpdateProductDto } from './dto/update.product.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { Request } from 'express';
import { FindOneProductDto } from './dto/find.one.product.dto';
import { FindByUserUidDto } from './dto/find.by.user.uid.dto';
import { MailerService } from 'src/mailer/mailer.service';
import { productAddedEmailTemplate } from 'src/mailer/html.templates';

@Controller('products')
@UseGuards(AuthGuard)
export class ProductsController {
    constructor(
        private readonly productsService: ProductsService,
        private readonly mailerService: MailerService,
    ) {}

    @Post()
    /**
     * Handles the creation of a new product and sends a notification email.
     *
     * @param createProductDto - The data transfer object containing information about the product to be created.
     *
     * @throws BadRequestException if the product data is invalid or if email sending fails.
     * @throws InternalServerErrorException if there's a problem with the database.
     */
    async create(@Body() createProductDto: CreateProductDto) {
        const result = await this.productsService.create(createProductDto);
        await this.mailerService.sendMailWithHTML(
            createProductDto.user_email,
            'New product created',
            productAddedEmailTemplate(createProductDto.url),
        );
    }

    @Get()
    /**
     * Retrieves all products associated with a specific user UID.
     *
     * @param findByUserUidDto - The data transfer object containing the user UID.
     *
     * @returns A promise that resolves to an array of products belonging to the specified user.
     */
    findAll(@Body() findByUserUidDto: FindByUserUidDto) {
        //const user_uid = request.body.user_uid;
        return this.productsService.findByUserUid(findByUserUidDto);
    }

    @Get(':id')
    /**
     * Retrieves a specific product by its ID.
     *
     * @param id - The data transfer object containing the product ID.
     *
     * @returns A promise that resolves to the product with the specified ID.
     *
     * @throws NotFoundException if the product with the given ID is not found.
     */
    findOne(@Param('id') id: FindOneProductDto) {
        return this.productsService.findOne(id);
    }

    @Patch(':id')
    /**
     * Updates a product by its ID.
     *
     * @param id - The ID of the product to be updated.
     * @param updateProductDto - The data transfer object containing the data to be updated.
     *
     * @returns A promise that resolves to the updated product.
     *
     * @throws InternalServerErrorException if there's a problem with the database.
     */
    update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
    ) {
        return this.productsService.update(+id, updateProductDto);
    }

    @Delete(':id')
    /**
     * Deletes a product by its ID.
     *
     * @param id - The ID of the product to be deleted.
     *
     * @throws InternalServerErrorException if there's a problem with the database.
     */
    remove(@Param('id') id: string) {
        return this.productsService.remove(+id);
    }

    @Delete()
    /**
     * Removes all products from the database that belong to a given user.
     *
     * @param findByUserUidDto - The data transfer object containing the user's unique identifier.
     *
     * @returns A promise that resolves to an array of the deleted product's information.
     *
     * @throws InternalServerErrorException if there's a problem with the database.
     */
    removeAllByUserUid(@Body() findByUserUidDto: FindByUserUidDto) {
        return this.productsService.removeAllByUserUid(
            findByUserUidDto.user_uid,
        );
    }
}
