import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades no definidas en los DTOs
      forbidNonWhitelisted: true, // lanza error si envían campos no permitidos
      transform: true, // convierte tipos (ej: string → number automáticamente)
    }),
  );

  await app.listen(3000);
}
bootstrap();

