import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from './mailer.service';
import { Transporter } from 'nodemailer';
import { ConfigModule } from '@nestjs/config';

describe('MailerService', () => {
    let service: MailerService;
    let transportMock: Partial<Transporter>;
    beforeEach(async () => {
        transportMock = {
            sendMail: jest.fn(),
        };
        const module: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule],
            providers: [
                { provide: 'TRANSPORTER', useValue: transportMock },
                MailerService,
            ],
        }).compile();

        service = module.get<MailerService>(MailerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
