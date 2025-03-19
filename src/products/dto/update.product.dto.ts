import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create.product.dto';
import { IsDate, IsNumber } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
    @IsNumber({ maxDecimalPlaces: 2 })
    current_price: number;

    @IsDate()
    last_checked_at: string;
}
