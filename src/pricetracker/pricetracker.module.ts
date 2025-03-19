import { Module } from '@nestjs/common';
import { PricetrackerService } from './pricetracker.service';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from 'src/database/database.module';
import { ScraperModule } from 'src/scraper/scraper.module';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
    imports: [HttpModule, DatabaseModule, ScraperModule, MailerModule],
    providers: [PricetrackerService],
    exports: [PricetrackerService],
})
export class PricetrackerModule {}
