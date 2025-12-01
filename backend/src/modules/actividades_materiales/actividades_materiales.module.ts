import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActividadesMaterialesService } from './actividades_materiales.service';
import { ActividadesMaterialesController } from './actividades_materiales.controller';
import { ActividadMaterial } from './entities/actividades_materiale.entity';
import { Material } from '../materiales/entities/materiale.entity';
import { Actividad } from '../actividades/entities/actividade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActividadMaterial, Material, Actividad])],
  controllers: [ActividadesMaterialesController],
  providers: [ActividadesMaterialesService],
})
export class ActividadesMaterialesModule {}

