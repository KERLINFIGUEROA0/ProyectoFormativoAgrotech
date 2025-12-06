import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';


async function bootstrap() {
  // --- 2. Especifica el tipo de la app ---
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:5173', // Frontend desarrollo
      'http://localhost:3000', // Backend mismo
      'https://pretelegraphic-cheree-lacunal.ngrok-free.dev', // ngrok URL
       // Para desarrollo
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  // --- 3. Añade esta línea para servir los archivos de la carpeta 'uploads' ---
  // Esto hace que se pueda acceder a las imágenes desde el navegador.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads', // Las URLs de las imágenes empezarán con /uploads
  });

  // Servir archivos desde el directorio temp-uploads para actividades
  app.useStaticAssets(join(process.cwd(), 'temp-uploads'), {
    prefix: '/temp-uploads', // Las URLs de los archivos temporales empezarán con /temp-uploads
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(3000);
}
bootstrap();