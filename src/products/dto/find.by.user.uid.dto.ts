import { IsString, IsNotEmpty } from 'class-validator';

export class FindByUserUidDto {
    @IsString({ message: 'User UID must be a string.' })
    @IsNotEmpty({ message: 'User UID cannot be empty.' })
    user_uid: string;
}
