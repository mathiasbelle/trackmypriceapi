import {
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
    private readonly logger = new Logger(MailerService.name);
    constructor(
        @Inject('TRANSPORTER') private readonly transporter: Transporter,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Sends an email using the configured SMTP transporter.
     * @param to Email address of the recipient.
     * @param subject Subject of the email.
     * @param text Body of the email.
     * @returns A Promise that resolves to the result of sending the email.
     * @throws InternalServerErrorException if there is an error sending the email.
     */
    async sendMail(to: string, subject: string, text: string) {
        try {
            return this.transporter.sendMail({
                from: this.configService.get('SMTP_FROM'),
                to,
                subject,
                text,
            });
        } catch (error) {
            this.logger.error(error);
            throw InternalServerErrorException;
        }
    }

    async sendMailWithHTML(to: string, subject: string, html: string) {
        try {
            return this.transporter.sendMail({
                from: this.configService.get('SMTP_FROM'),
                to,
                subject,
                html,
            });
        } catch (error) {
            this.logger.error(error);
            throw InternalServerErrorException;
        }
    }
}
