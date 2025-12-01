import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [TypeOrmModule.forFeature([Cultivo, TipoCultivo, Lote, Sublote, Actividad, ActividadMaterial, Produccion, Gasto, Venta, Material])],
  controllers: [CultivosController],
  providers: [CultivosService, PdfService],
  exports: [CultivosService, PdfService],
})
export class CultivosModule {}
