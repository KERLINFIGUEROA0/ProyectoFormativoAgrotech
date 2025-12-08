import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

// --- CONFIGURACIÓN DE ZONA HORARIA ---
process.env.TZ = 'America/Bogota';

async function bootstrap() {
  // --- 2. Especifica el tipo de la app ---
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // --- WebSocket Adapter (usar configuración por defecto) ---
  // app.useWebSocketAdapter(new IoAdapter(app));

  app.enableCors({
    origin: ['http://localhost:5173'],
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