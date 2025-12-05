import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Sublote } from '../../sublotes/entities/sublote.entity';
import { Lote } from '../../lotes/entities/lote.entity';
import { InformacionSensor } from '../../informacion_sensor/entities/informacion_sensor.entity';

@Entity('sensores')
export class Sensor {
  @PrimaryGeneratedColumn({ name: 'Id_Sensor' })
  id: number;

  @Column({ name: 'Nombre', length: 100, nullable: false })
  nombre: string;

  @Column({ name: 'Fecha_Instalacion', type: 'date' })
  fecha_instalacion: Date;

  @Column({
    name: 'Valor_Minimo_Alerta',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  valor_minimo_alerta: number;

  @Column({
    name: 'Valor_Maximo_Alerta',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  valor_maximo_alerta: number;

  @Column({ name: 'Estado', length: 20, default: 'Activo' })
  estado: string;

  @Column({ name: 'Frecuencia_Escaneo', type: 'int', default: 60 })
  frecuencia_escaneo: number;

  @Column({ name: 'mqtt_topic', type: 'varchar', length: 255, nullable: true })
  topic: string | null;

  // ✅ NUEVO CAMPO: Clave del JSON a leer (opcional)
  // Si es null, el sistema asume que el payload es un número directo.
  // Si tiene texto (ej: "temperatura"), buscará esa clave en el JSON.
  @Column({ name: 'json_key', type: 'varchar', length: 50, nullable: true })
  json_key: string | null;

  // Nueva columna para mapear con sensorKey dinámico de InformacionSensor
  @Column({ name: 'sensor_key', type: 'varchar', length: 100, nullable: true })
  sensorKey: string | null;

  @Column({ name: 'ultimo_mqtt_mensaje', type: 'timestamp', nullable: true })
  ultimo_mqtt_mensaje: Date | null;

  // ✅ CONFIGURACIÓN DE ESTADO DE CONEXIÓN
  // Campo del JSON que indica estado de conexión (ej: "estado", "status", "connected")
  @Column({ name: 'connection_field', type: 'varchar', length: 50, nullable: true })
  connectionField: string | null;

  // Si el campo de conexión es obligatorio (si no llega, se considera desconexión)
  @Column({ name: 'connection_required', type: 'boolean', default: false })
  connectionRequired: boolean;

  // Valores que indican desconexión (JSON array: [0, false, "offline", "disconnected"])
  @Column({ name: 'disconnection_values', type: 'json', nullable: true })
  disconnectionValues: any[];

  // Valores que indican conexión (JSON array: [1, true, "online", "connected"])
  @Column({ name: 'connection_values', type: 'json', nullable: true })
  connectionValues: any[];

  @ManyToOne(() => Lote, (lote) => lote.sublotes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loteId' })
  lote: Lote;

  @ManyToOne(() => Sublote, (sublote) => sublote.sensores, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subloteId' })
  sublote: Sublote | null;

  @OneToMany(() => InformacionSensor, (info) => info.sensor)
  informaciones: InformacionSensor[];
}