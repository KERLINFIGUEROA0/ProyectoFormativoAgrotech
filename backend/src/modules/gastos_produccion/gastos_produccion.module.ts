import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GastosProduccionService } from './gastos_produccion.service';
import { GastosProduccionController } from './gastos_produccion.controller';
import { Gasto } from './entities/gastos_produccion.entity';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity'; // <-- 1. IMPORTAR CULTIVO

@Module({
  imports: [TypeOrmModule.forFeature([Gasto, Produccion, Cultivo])], // <-- 2. AÑADIR CULTIVO
  controllers: [GastosProduccionController],
  providers: [GastosProduccionService],
  exports: [GastosProduccionService],
})
export class GastosProduccionModule {}