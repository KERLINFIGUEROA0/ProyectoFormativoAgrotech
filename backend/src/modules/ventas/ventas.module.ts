import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { Venta } from './entities/venta.entity';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { Pago } from '../pagos/entities/pago.entity';
import { PdfModule } from '../pdf/pdf.module'; // <-- Importar

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, Produccion, Gasto, Pago]),
    PdfModule, // <-- Añadir
  ],
  controllers: [VentasController],
  providers: [VentasService],
   exports: [VentasService],

})
export class VentasModule {}


//  exports: [VentasService],


