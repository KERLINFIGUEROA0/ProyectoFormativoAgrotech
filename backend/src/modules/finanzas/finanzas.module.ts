import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanzasController } from './finanzas.controller';
import { FinanzasService } from './finanzas.service';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Material } from '../materiales/entities/materiale.entity';
import { VentasService } from '../ventas/ventas.service';
import { Venta } from '../ventas/entities/venta.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { Pago } from '../pagos/entities/pago.entity';
import { PdfModule } from '../pdf/pdf.module';
import { Cultivo } from '../cultivos/entities/cultivo.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Produccion, Material, Venta, Gasto, Pago, Cultivo]),
    PdfModule,
  ],
  controllers: [FinanzasController],
  providers: [FinanzasService, VentasService],
  exports: [FinanzasService],
})
export class FinanzasModule {}