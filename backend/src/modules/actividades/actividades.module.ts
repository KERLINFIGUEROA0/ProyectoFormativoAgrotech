import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActividadesService } from './actividades.service';
import { ActividadesController } from './actividades.controller';
import { Actividad } from './entities/actividade.entity';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Cultivo } from '../cultivos/entities/cultivo.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Sublote } from '../sublotes/entities/sublote.entity';
import { Material } from '../materiales/entities/materiale.entity';
import { ActividadMaterial } from '../actividades_materiales/entities/actividades_materiale.entity';
import { MaterialesModule } from '../materiales/materiales.module';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity'; // <-- 1. IMPORTAR GASTO
import { RespuestaActividad } from './entities/respuesta_actividad.entity';
import { ActividadUsuario } from './entities/actividad_usuario.entity';
import { MovimientosModule } from '../../movimientos/movimientos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Actividad,
      Usuario,
      Cultivo,
      Lote,
      Sublote,
      Material,
      ActividadMaterial,
      Gasto, // <-- 2. AÑADIR GASTO AQUÍ
      RespuestaActividad,
      ActividadUsuario
    ]),
    MulterModule.register({
      // ... (configuración de multer)
      storage: diskStorage({
        destination: (req, file, cb) => {
          console.log('📁 Configurando destino para archivo:', file.originalname);
          const dest = './uploads/actividades';
          console.log('📁 Destino configurado:', dest);
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          console.log('📝 Generando nombre para archivo:', file.originalname);
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `imagenes-${uniqueSuffix}${ext}`;
          console.log('📝 Nombre generado:', filename);
          cb(null, filename);
        },
      }),
    }),
    MaterialesModule,
    MovimientosModule,
  ],
  controllers: [ActividadesController],
  providers: [ActividadesService],
  exports: [ActividadesService],
})
export class ActividadesModule {}