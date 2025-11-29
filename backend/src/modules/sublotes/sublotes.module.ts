import { Module } from '@nestjs/common';
import {
  forwardRef   // <--- IMPORTANTE
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sublote } from './entities/sublote.entity';
import { SublotesService } from './sublotes.service';
import { SublotesController } from './sublotes.controller';
import { Lote } from '../lotes/entities/lote.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { Broker } from '../mqtt-config/entities/broker.entity';
import { BrokerLote } from '../mqtt-config/entities/broker-lote.entity';
import { MqttConfigModule } from '../mqtt-config/mqtt-config.module'; // Importar
@Module({
  imports: [
    TypeOrmModule.forFeature([Sublote, Lote, Cultivo, Broker, BrokerLote]),
    forwardRef(() => MqttConfigModule), // ✅ Agregamos esto
  ],
  controllers: [SublotesController],
  providers: [SublotesService],
  exports: [SublotesService],
})
export class SublotesModule { }