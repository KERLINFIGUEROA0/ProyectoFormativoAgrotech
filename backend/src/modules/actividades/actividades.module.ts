import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActividadesService } from './actividades.service';
import { ActividadesController } from './actividades.controller';
import { Actividad } from './entities/actividade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Actividad])],
  controllers: [ActividadesController],
  providers: [ActividadesService],
})
export class ActividadesModule {}
