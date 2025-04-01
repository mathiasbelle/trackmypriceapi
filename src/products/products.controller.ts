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

@Controller('products')
@UseGuards(AuthGuard)
export class ProductsController {
    constructor(
        private readonly productsService: ProductsService,
        private readonly mailerService: MailerService,
    ) {}
    @Post()
    async create(@Body() createProductDto: CreateProductDto) {
        const result = await this.productsService.create(createProductDto);
        await this.mailerService.sendMail(
            createProductDto.user_email,
            'New product created',
            `A new product has been created. URL: ${createProductDto.url}`,
        );
    }

    @Get()
    findAll(@Body() findByUserUidDto: FindByUserUidDto) {
        //const user_uid = request.body.user_uid;
        return this.productsService.findByUserUid(findByUserUidDto);
    }

    @Get(':id')
    findOne(@Param('id') id: FindOneProductDto) {
        return this.productsService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
    ) {
        return this.productsService.update(+id, updateProductDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.productsService.remove(+id);
    }

    @Delete()
    removeAllByUserUid(@Body() findByUserUidDto: FindByUserUidDto) {
        return this.productsService.removeAllByUserUid(
            findByUserUidDto.user_uid,
        );
    }
}
