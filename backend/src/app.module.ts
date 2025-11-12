// app.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppDataSource } from '../typeorm.config';
import { multerConfig } from './config/multer/multer.config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { ActividadesModule } from './modules/actividades/actividades.module';
import { ActividadesMaterialesModule } from './modules/actividades_materiales/actividades_materiales.module';
import { CultivosModule } from './modules/cultivos/cultivos.module';
import { TrazabilidadModule } from './modules/trazabilidad/trazabilidad.module';
import { EpaModule } from './modules/epa/epa.module';
import { GastosProduccionModule } from './modules/gastos_produccion/gastos_produccion.module';
import { InformacionSensorModule } from './modules/informacion_sensor/informacion_sensor.module';
import { LotesModule } from './modules/lotes/lotes.module';
import { MaterialesModule } from './modules/materiales/materiales.module';
import { ProduccionesModule } from './modules/producciones/producciones.module';
import { SensoresModule } from './modules/sensores/sensores.module';
import { SurcosModule } from './modules/surcos/surcos.module';
import { TipoCultivoModule } from './modules/tipo_cultivo/tipo_cultivo.module';
import { TipoSensorModule } from './modules/tipo_sensor/tipo_sensor.module';
import { TipoUsuarioModule } from './modules/tipo_usuario/tipo_usuario.module';
import { TratamientosModule } from './modules/tratamientos/tratamientos.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { EpaTratamientoModule } from './modules/epa_tratamiento/epa_tratamiento.module'; 
import { CultivosEpaModule } from './modules/cultivos_epa/cultivos_epa.module';
import { RolPermisoModule } from './modules/rol_permiso/rol_permiso.module';
import { PermisosModule } from './modules/permisos/permisos.module';
import { UsuarioPermisoModule } from './modules/usuarios_permisos/usuarios_permisos.module';
import { ModulosModule } from './modules/modulos/modulos.module';
import { AuthModule } from './auth/auth.module';
import { MulterModule } from '@nestjs/platform-express';
import { NotificationsModule } from './notifications/notifications.module';
import { MqttConfigModule } from './modules/mqtt-config/mqtt-config.module';
import { FichasModule } from './modules/fichas/fichas.module';


@Module({
  imports: [
    HttpModule,
    MulterModule.register(multerConfig),
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          url: configService.get<string>('REDIS_URL'),
        }),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
    }),

    ActividadesModule,
    ActividadesMaterialesModule,
    CultivosModule,
    EpaModule,
    GastosProduccionModule,
    InformacionSensorModule,
    LotesModule,
    MaterialesModule,
    ProduccionesModule,
    SensoresModule,
    SurcosModule,
    TipoCultivoModule,
    TipoSensorModule,
    TipoUsuarioModule,
    TratamientosModule,
    UsuariosModule,
    VentasModule,
    EpaTratamientoModule,
    CultivosEpaModule,
    TrazabilidadModule,
    RolPermisoModule,
    PermisosModule,
    UsuarioPermisoModule,
    ModulosModule,
    AuthModule,
    NotificationsModule,
    MqttConfigModule,
    FichasModule,
  ],
  providers: [],
  controllers: []
})
export class AppModule { }

