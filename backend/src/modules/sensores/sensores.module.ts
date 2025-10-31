import { Module } from '@nestjs/common';
import { SensoresService } from './sensores.service';
import { SensoresController } from './sensores.controller';

@Module({
  controllers: [SensoresController],
  providers: [SensoresService],
})
export class SensoresModule {}

