import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { DatabaseModule } from 'src/database/database.module';
import { FirebaseAdmin } from 'src/config/firebase.setup';
import { MailerModule } from 'src/mailer/mailer.module';
import { ScraperModule } from 'src/scraper/scraper.module';

@Module({
    controllers: [ProductsController],
    providers: [ProductsService, FirebaseAdmin],
    exports: [ProductsService],
    imports: [DatabaseModule, ScraperModule, MailerModule],
})
export class ProductsModule {}
