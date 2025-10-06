import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { Venta } from './entities/venta.entity';
import { Produccion } from '../../../modules/producciones/entities/produccione.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, Produccion])
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}