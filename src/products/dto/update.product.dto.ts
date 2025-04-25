import { IsDate, IsNumber, IsOptional } from 'class-validator';

export class UpdateProductDto {
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    current_price?: number;

    @IsOptional()
    @IsDate()
    last_checked_at?: string;
}
