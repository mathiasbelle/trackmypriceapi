import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

const transporter = (configService: ConfigService) => {
    return nodemailer.createTransport({
        host: configService.get('SMTP_HOST'),
        port: Number(configService.get<number>('SMTP_PORT')),
        secure: configService.get('SMTP_SECURE') === 'true',
        auth: {
            user: configService.get('SMTP_USER'),
            pass: configService.get('SMTP_PASSWORD'),
        },
    });
};

@Module({
    providers: [
        {
            provide: 'TRANSPORTER',
            useFactory: transporter,
            inject: [ConfigService],
        },
        MailerService,
    ],
    exports: [MailerService],
})
export class MailerModule {}
