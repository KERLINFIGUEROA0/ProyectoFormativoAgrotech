import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoCultivo } from './entities/tipo_cultivo.entity';
import { TipoCultivoService } from './tipo_cultivo.service';
import { TipoCultivoController } from './tipo_cultivo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TipoCultivo])],
  controllers: [TipoCultivoController],
  providers: [TipoCultivoService],
  exports: [TipoCultivoService],
})
export class TipoCultivoModule {}
