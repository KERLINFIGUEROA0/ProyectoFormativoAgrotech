import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialesService } from './materiales.service';
import { MaterialesController } from './materiales.controller';
import { Material } from './entities/materiale.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material])], // Importamos la entidad
  controllers: [MaterialesController],
  providers: [MaterialesService],
})
export class MaterialesModule {}
