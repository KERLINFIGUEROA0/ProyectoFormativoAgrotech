import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
// --- 1. Importa lo necesario ---
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';


async function bootstrap() {
  // --- 2. Especifica el tipo de la app ---
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  // --- 3. Añade esta línea para servir los archivos de la carpeta 'uploads' ---
  // Esto hace que se pueda acceder a las imágenes desde el navegador.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads', // Las URLs de las imágenes empezarán con /uploads
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: {
      // 👇 REEMPLAZA ESTO con la URL de tu broker MQTT
      // Ejemplo: 'mqtt://localhost:1883' o 'mqtt://test.mosquitto.org'
      url: 'mqtt://test.mosquitto.org:1883',
      // Opciones adicionales si tu broker requiere autenticación
      // username: 'tu_usuario',
      // password: 'tu_password',
    },
  });

  // --- 3. Inicia AMBOS servicios ---
  await app.startAllMicroservices();
  await app.listen(3000);
}
bootstrap();