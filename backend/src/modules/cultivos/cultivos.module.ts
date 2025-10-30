import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CultivosController } from './cultivos.controller';
import { CultivosService } from './cultivos.service';
import { Cultivo } from './entities/cultivo.entity';
import { TipoCultivo } from '../tipo_cultivo/entities/tipo_cultivo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cultivo, TipoCultivo])],
  controllers: [CultivosController],
  providers: [CultivosService],
  exports: [CultivosService],
})
export class CultivosModule {}
