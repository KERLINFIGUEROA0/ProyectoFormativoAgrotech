import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Surco } from '../../surcos/entities/surco.entity';
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

  @Column({ name: 'ultimo_mqtt_mensaje', type: 'timestamp', nullable: true })
  ultimo_mqtt_mensaje: Date | null;

  @ManyToOne(() => Lote, (lote) => lote.surcos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loteId' })
  lote: Lote;

  @ManyToOne(() => Surco, (surco) => surco.sensores, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'surcoId' })
  surco: Surco | null;

  @OneToMany(() => InformacionSensor, (info) => info.sensor)
  informaciones: InformacionSensor[];
}