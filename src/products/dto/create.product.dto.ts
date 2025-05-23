import { IsEmail, IsUrl } from 'class-validator';

export class CreateProductDto {
    @IsUrl({ protocols: ['https'] })
    url: string;

    user_uid: string;

    @IsEmail()
    user_email: string;
}
