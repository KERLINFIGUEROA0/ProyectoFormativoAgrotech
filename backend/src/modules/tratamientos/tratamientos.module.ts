import { Module } from '@nestjs/common';
import { TratamientosService } from './tratamientos.service';
import { TratamientosController } from './tratamientos.controller';

@Module({
  controllers: [TratamientosController],
  providers: [TratamientosService],
})
export class TratamientosModule {}

