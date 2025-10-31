import { Module } from '@nestjs/common';
import { CultivosEpaService } from './cultivos_epa.service';
import { CultivosEpaController } from './cultivos_epa.controller';

@Module({
  controllers: [CultivosEpaController],
  providers: [CultivosEpaService],
})
export class CultivosEpaModule {}

