import { Module } from '@nestjs/common';
import {
  forwardRef   // <--- IMPORTANTE
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Surco } from './entities/surco.entity';
import { SurcosService } from './surcos.service';
import { SurcosController } from './surcos.controller';
import { Lote } from '../lotes/entities/lote.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { Broker } from '../mqtt-config/entities/broker.entity';
import { MqttConfigModule } from '../mqtt-config/mqtt-config.module'; // Importar
@Module({
  imports: [
    TypeOrmModule.forFeature([Surco, Lote, Cultivo, Broker]),
    forwardRef(() => MqttConfigModule), // ✅ Agregamos esto
  ],
  controllers: [SurcosController],
  providers: [SurcosService],
  exports: [SurcosService],
})
export class SurcosModule { } 