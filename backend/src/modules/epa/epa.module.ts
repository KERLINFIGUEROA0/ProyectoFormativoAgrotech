import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EpaService } from './epa.service';
import { HttpModule } from '@nestjs/axios'; 
import { EpaController } from './epa.controller';
import { Epa } from './entities/epa.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Epa]),
    HttpModule
  ],
  controllers: [EpaController],
  providers: [EpaService],
})
export class EpaModule {}