import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DraculaController } from './dracula.controller';
import { DraculaService } from './dracula.service';
import { Dracula } from './entities/dracula.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dracula])],
  controllers: [DraculaController],
  providers: [DraculaService],
  exports: [DraculaService],
})
export class DraculaModule {}