import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        cors: {
            origin: process.env.CORS_ORIGIN,
        },
        logger:
            process.env.NODE_ENV === 'development' ||
            process.env.NODE_ENV === 'debug'
                ? ['log', 'debug', 'error', 'verbose', 'warn']
                : ['error', 'warn'],
    });
    app.useGlobalPipes(new ValidationPipe());

    const config = new DocumentBuilder()
        .setTitle('TrackMyPrice API')
        .setDescription('The TrackMyPrice API description')
        .setVersion('1.0')
        .addTag('trackmyprice, api, tracking, prices, scraping, scraper')
        .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('/', app, documentFactory);

    await app.listen(process.env.PORT || 3000);
}
bootstrap();
