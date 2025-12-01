import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialesService } from './materiales.service';
import { MaterialesController } from './materiales.controller';
import { Material } from './entities/materiale.entity';
import { MovimientosModule } from '../../movimientos/movimientos.module';

@Module({
  imports: [TypeOrmModule.forFeature([Material]), MovimientosModule], // Importamos la entidad y el módulo de movimientos
  controllers: [MaterialesController],
  providers: [MaterialesService],
})
export class MaterialesModule {}
