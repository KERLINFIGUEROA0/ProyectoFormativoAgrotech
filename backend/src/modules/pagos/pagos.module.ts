import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosService } from './pagos.service';
import { PagosController } from './pagos.controller';
import { Pago } from './entities/pago.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Actividad } from '../actividades/entities/actividade.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pago, Usuario, Actividad, Gasto]),
    UsuariosModule,
  ],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}