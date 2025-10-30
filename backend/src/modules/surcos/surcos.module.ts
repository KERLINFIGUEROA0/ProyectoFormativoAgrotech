import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Surco } from './entities/surco.entity';
import { SurcosService } from './surcos.service';
import { SurcosController } from './surcos.controller';
import { Lote } from '../lotes/entities/lote.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Surco, Lote, Cultivo])],
  controllers: [SurcosController],
  providers: [SurcosService],
})
export class SurcosModule {}

