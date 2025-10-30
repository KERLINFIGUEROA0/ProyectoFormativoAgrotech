// src/modulos/modulos.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modulo } from './entities/modulo.entity';
import { ModulosService } from './modulos.service';
import { ModulosController } from './modulos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Modulo])],
  controllers: [ModulosController],
  providers: [ModulosService],
  exports: [ModulosService], // exportamos por si lo necesitas en auth o permisos
})
export class ModulosModule {}

