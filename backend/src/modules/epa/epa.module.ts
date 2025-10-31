import { Module } from '@nestjs/common';
import { EpaService } from './epa.service';
import { EpaController } from './epa.controller';

@Module({
  controllers: [EpaController],
  providers: [EpaService],
})
export class EpaModule {}

