import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TratamientosService } from './tratamientos.service';
import { TratamientosController } from './tratamientos.controller';
import { Tratamiento } from './entities/tratamiento.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity'; // <-- 1. IMPORTAR LA ENTIDAD CULTIVO


@Module({
  imports: [TypeOrmModule.forFeature([Tratamiento, Cultivo])], 
  controllers: [TratamientosController],
  providers: [TratamientosService],
})
export class TratamientosModule {}