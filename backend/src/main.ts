import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger: Logger = new Logger('----- Bootstrap -----');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const PORT: number = configService.get<number>('PORT') || 3000;
  const API_PREFIX: string =
    configService.get<string>('API_PREFIX') || 'api/v1';

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableCors({
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
    credentials: true,
  });

  await app.listen(PORT);
  logger.log(
    `Application is running on: http://localhost:${PORT}${API_PREFIX}`,
  );
  logger.log(
    `Environment: ${configService.get<string>('NODE_ENV') || 'development'}`,
  );
}
void bootstrap();
