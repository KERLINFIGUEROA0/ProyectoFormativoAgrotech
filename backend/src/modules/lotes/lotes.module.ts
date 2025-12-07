import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Lote } from './entities/lote.entity';
import { LotesService } from './lotes.service';
import { LotesController } from './lotes.controller';
import { WebSocketModule } from '../../websocket/websocket.module';
import { PdfModule } from '../pdf/pdf.module';
import { SensoresModule } from '../sensores/sensores.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lote]),
    CacheModule.register(),
    WebSocketModule,
    PdfModule,
    SensoresModule
  ],
  controllers: [LotesController],
  providers: [LotesService],
})
export class LotesModule {}

