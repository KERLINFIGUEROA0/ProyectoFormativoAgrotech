import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

import { Actividad } from './src/modules/actividades/entities/actividade.entity';
import { RespuestaActividad } from './src/modules/actividades/entities/respuesta_actividad.entity';
import { ActividadUsuario } from './src/modules/actividades/entities/actividad_usuario.entity';
import { ActividadMaterial } from './src/modules/actividades_materiales/entities/actividades_materiale.entity';
import { Cultivo } from './src/modules/cultivos/entities/cultivo.entity';
import { Epa } from './src/modules/epa/entities/epa.entity';
import { Gasto } from './src/modules/gastos_produccion/entities/gastos_produccion.entity';
import { InformacionSensor } from './src/modules/informacion_sensor/entities/informacion_sensor.entity';
import { Lote } from './src/modules/lotes/entities/lote.entity';
import { Material } from './src/modules/materiales/entities/materiale.entity';
import { Produccion } from './src/modules/producciones/entities/produccione.entity';
import { Sensor } from './src/modules/sensores/entities/sensore.entity';
import { Sublote } from './src/modules/sublotes/entities/sublote.entity';
import { TipoCultivo } from './src/modules/tipo_cultivo/entities/tipo_cultivo.entity';
import { TipoSensor } from './src/modules/tipo_sensor/entities/tipo_sensor.entity';
import { TipoUsuario } from './src/modules/tipo_usuario/entities/tipo_usuario.entity';
import { Tratamiento } from './src/modules/tratamientos/entities/tratamiento.entity';
import { Usuario } from './src/modules/usuarios/entities/usuario.entity';
import { Venta } from './src/modules/ventas/entities/venta.entity';
import { CultivoEpa } from './src/modules/cultivos_epa/entities/cultivos_epa.entity';
import { EpaTratamiento } from './src/modules/epa_tratamiento/entities/epa_tratamiento.entity';
import { RolPermiso } from './src/modules/rol_permiso/entities/rol_permiso.entity';
import { Permiso } from './src/modules/permisos/entities/permiso.entity';
import { UsuarioPermiso } from './src/modules/usuarios_permisos/entities/usuarios_permiso.entity';
import { Modulo } from './src/modules/modulos/entities/modulo.entity';
import { Ficha } from './src/modules/fichas/entities/ficha.entity';
import { Broker } from './src/modules/mqtt-config/entities/broker.entity';
import { BrokerLote } from './src/modules/mqtt-config/entities/broker-lote.entity';
import { Subscripcion } from './src/modules/mqtt-config/entities/subscripcion.entity';
import { Movimiento } from './src/movimientos/entities/movimiento.entity';
import { Pago } from './src/modules/pagos/entities/pago.entity';

const isCompiled = __dirname.includes('dist');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    Actividad,
    RespuestaActividad,
    ActividadUsuario,
    ActividadMaterial,
    Cultivo,
    Epa,
    Gasto,
    InformacionSensor,
    Lote,
    Material,
    Produccion,
    Sensor,
    Sublote,
    TipoCultivo,
    TipoSensor,
    TipoUsuario,
    Tratamiento,
    Usuario,
    Venta,
    EpaTratamiento,
    CultivoEpa,
    RolPermiso,
    Permiso,
    UsuarioPermiso,
    Modulo,
    Ficha,
    Broker,
    BrokerLote,
    Subscripcion,
    Movimiento,
    Pago,
  ],
  migrations: [
    isCompiled
      ? join(__dirname, 'migrations', '*.js') // producción
      : join(__dirname, 'migrations', '*.ts'), // desarrollo
  ],
  synchronize: true,
});
