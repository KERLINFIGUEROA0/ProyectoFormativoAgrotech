import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GastosProduccionService } from './gastos_produccion.service';
import { GastosProduccionController } from './gastos_produccion.controller';
import { Gasto } from './entities/gastos_produccion.entity';
import { Produccion } from '../producciones/entities/produccione.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Gasto, Produccion])], // 👈 AÑADIDO
  controllers: [GastosProduccionController],
  providers: [GastosProduccionService],
})
export class GastosProduccionModule {}