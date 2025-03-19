import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { UsersController } from './users/users.controller';
import { ProductsModule } from './products/products.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PricetrackerModule } from './pricetracker/pricetracker.module';
import { ScraperModule } from './scraper/scraper.module';
import { MailerModule } from './mailer/mailer.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduleModule.forRoot(),
        DatabaseModule,
        UsersModule,
        ProductsModule,
        PricetrackerModule,
        ScraperModule,
        MailerModule,
    ],
    controllers: [AppController, UsersController],
    providers: [AppService],
})
export class AppModule {}
