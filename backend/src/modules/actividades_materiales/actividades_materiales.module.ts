import { Module } from '@nestjs/common';
import { ActividadesMaterialesService } from './actividades_materiales.service';
import { ActividadesMaterialesController } from './actividades_materiales.controller';

@Module({
  controllers: [ActividadesMaterialesController],
  providers: [ActividadesMaterialesService],
})
export class ActividadesMaterialesModule {}

