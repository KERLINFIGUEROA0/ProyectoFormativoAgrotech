import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { Venta } from './entities/venta.entity';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity'; // 👈 IMPORTAR Gasto

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, Produccion, Gasto]) // 👈 AÑADIR Gasto aquí
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}