import { Module } from '@nestjs/common';
import { GastosProduccionService } from './gastos_produccion.service';
import { GastosProduccionController } from './gastos_produccion.controller';

@Module({
  controllers: [GastosProduccionController],
  providers: [GastosProduccionService],
})
export class GastosProduccionModule {}

