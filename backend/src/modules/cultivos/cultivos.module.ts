import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { CultivosController } from './cultivos.controller';
import { CultivosService } from './cultivos.service';
import { PdfService } from './pdf.service';
import { Cultivo } from './entities/cultivo.entity';
import { TipoCultivo } from '../tipo_cultivo/entities/tipo_cultivo.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Sublote } from '../sublotes/entities/sublote.entity';
import { Actividad } from '../actividades/entities/actividade.entity';
import { ActividadMaterial } from '../actividades_materiales/entities/actividades_materiale.entity';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { Venta } from '../../common/enums/ventas/entities/venta.entity';
import { Material } from '../materiales/entities/materiale.entity';
import { Pago } from '../pagos/entities/pago.entity';
import { WebSocketModule } from '../../websocket/websocket.module';
import { PagosModule } from '../pagos/pagos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cultivo, TipoCultivo, Lote, Sublote, Actividad, Produccion, Gasto, Venta, Pago]),
    CacheModule.register(),
    WebSocketModule,
    PagosModule,
  ],
  controllers: [CultivosController],
  providers: [CultivosService, PdfService],
  exports: [CultivosService, PdfService],
})
export class CultivosModule {}
