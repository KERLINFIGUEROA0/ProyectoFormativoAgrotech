import { Module } from '@nestjs/common';
import { EpaTratamientoService } from './epa_tratamiento.service';
import { EpaTratamientoController } from './epa_tratamiento.controller';

@Module({
  controllers: [EpaTratamientoController],
  providers: [EpaTratamientoService],
})
export class EpaTratamientoModule {}

