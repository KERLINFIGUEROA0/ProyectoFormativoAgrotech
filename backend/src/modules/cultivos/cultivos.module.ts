import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { CultivosController } from './cultivos.controller';
import { CultivosService } from './cultivos.service';
import { Cultivo } from './entities/cultivo.entity';
import { TipoCultivo } from '../tipo_cultivo/entities/tipo_cultivo.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Sublote } from '../sublotes/entities/sublote.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cultivo, TipoCultivo, Lote, Sublote]),
    CacheModule.register(),
  ],
  controllers: [CultivosController],
  providers: [CultivosService],
  exports: [CultivosService],
})
export class CultivosModule {}
