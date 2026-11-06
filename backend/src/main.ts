import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger: Logger = new Logger('----- Bootstrap -----');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const PORT: number = configService.get<number>('PORT') || 3000;
  const API_PREFIX: string =
    configService.get<string>('API_PREFIX') || 'api/v1';

  const cleanPrefix = API_PREFIX.replace(/^\/+/, '');
  app.setGlobalPrefix(cleanPrefix);
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API de Autenticación y Autorización por Roles')
    .setDescription(
      'Documentación completa e interactiva de la API con NestJS, TypeORM, PostgreSQL y JWT. Provee control de acceso basado en roles (ADMIN, USER, GUEST).',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description:
          'Ingrese el token JWT con formato: Bearer <token> para acceder a los endpoints protegidos',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${cleanPrefix}/docs`, app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(PORT);
  logger.log(
    `Application is running on: http://localhost:${PORT}/${cleanPrefix}`,
  );
  logger.log(
    `Swagger documentation available at: http://localhost:${PORT}/${cleanPrefix}/docs`,
  );
  logger.log(
    `Environment: ${configService.get<string>('NODE_ENV') || 'development'}`,
  );
}
void bootstrap();
