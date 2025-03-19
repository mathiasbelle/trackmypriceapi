import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        cors: true,
        logger:
            process.env.NODE_ENV === 'development' ||
            process.env.NODE_ENV === 'debug'
                ? ['log', 'debug', 'error', 'verbose', 'warn']
                : ['error', 'warn'],
    });
    app.useGlobalPipes(new ValidationPipe());
    await app.listen(process.env.PORT || 3000);
}
bootstrap();
