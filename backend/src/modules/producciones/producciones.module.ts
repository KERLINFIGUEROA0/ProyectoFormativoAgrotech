import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProduccionesService } from './producciones.service';
import { ProduccionesController } from './producciones.controller';
import { Produccion } from './entities/produccione.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity'; // 👈 Importamos Cultivo

@Module({
  imports: [
    TypeOrmModule.forFeature([Produccion, Cultivo]) // 👈 Registramos las entidades necesarias
  ],
  controllers: [ProduccionesController],
  providers: [ProduccionesService],
  exports: [ProduccionesService],
})
export class ProduccionesModule {}