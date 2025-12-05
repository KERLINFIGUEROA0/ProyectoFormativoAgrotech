import { Module } from '@nestjs/common';
import { TrazabilidadController } from './trazabilidad.controller';
import { TrazabilidadService } from './trazabilidad.service';
import { CultivosModule } from '../cultivos/cultivos.module';
import { ActividadesModule } from '../actividades/actividades.module';
import { ProduccionesModule } from '../producciones/producciones.module';
import { VentasModule } from '../ventas/ventas.module';
import { PagosModule } from '../pagos/pagos.module';
import { MovimientosModule } from '../../movimientos/movimientos.module';

@Module({
  imports: [
    CultivosModule,     // Para obtener info del cultivo
    ActividadesModule,  // Para obtener las actividades realizadas
    ProduccionesModule, // Para obtener las cosechas
    VentasModule,       // Para obtener las ventas
    PagosModule,        // Para obtener los pagos
    MovimientosModule,  // Para obtener movimientos de materiales
  ],
  controllers: [TrazabilidadController],
  providers: [TrazabilidadService],
})
export class TrazabilidadModule {}