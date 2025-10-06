import {Entity,PrimaryGeneratedColumn,Column,ManyToOne,OneToMany,} from 'typeorm';
import { Surco } from '../../surcos/entities/surco.entity';
import { TipoSensor } from '../../tipo_sensor/entities/tipo_sensor.entity';
import { InformacionSensor } from '../../informacion_sensor/entities/informacion_sensor.entity';

@Entity('sensores')
export class Sensor {
  @PrimaryGeneratedColumn({ name: 'Id_Sensor' })
  id: number;

  @Column({ name: 'Nombre', length: 100, nullable: false }) // Aumentado el límite para nombres más largos
  nombre: string;

  // --- CAMPOS NUEVOS ---
  @Column({ name: 'Fecha_Instalacion', type: 'date' })
  fecha_instalacion: Date;

  @Column({ name: 'Valor_Minimo_Alerta', type: 'decimal', precision: 10, scale: 2 })
  valor_minimo_alerta: number;

  @Column({ name: 'Valor_Maximo_Alerta', type: 'decimal', precision: 10, scale: 2 })
  valor_maximo_alerta: number;

  @Column({ name: 'Estado', length: 20, default: 'Activo' }) // Ejemplo: 'Activo', 'Inactivo', 'Mantenimiento'
  estado: string;
  // --- FIN DE CAMPOS NUEVOS ---

  @ManyToOne(() => Surco, (surco) => surco.sensores, { onDelete: 'CASCADE' })
  surco: Surco;

  @ManyToOne(() => TipoSensor, (tipoSensor) => tipoSensor.sensores, {
    onDelete: 'CASCADE',
  })
  tipoSensor: TipoSensor;

  @OneToMany(() => InformacionSensor, (info) => info.sensor)
  informaciones: InformacionSensor[];
}