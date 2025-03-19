import { IsInt, Min } from 'class-validator';

export class FindOneProductDto {
    @IsInt({ message: 'Product ID must be an integer.' })
    @Min(1, { message: 'Product ID must be greater than 0.' })
    id: number;
}
