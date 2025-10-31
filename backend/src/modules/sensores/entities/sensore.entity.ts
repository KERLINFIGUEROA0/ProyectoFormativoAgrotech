import {Entity,PrimaryGeneratedColumn,Column,ManyToOne,OneToMany,} from 'typeorm';
import { Surco } from '../../surcos/entities/surco.entity';
import { TipoSensor } from '../../tipo_sensor/entities/tipo_sensor.entity';
import { InformacionSensor } from '../../informacion_sensor/entities/informacion_sensor.entity';

@Entity('sensores')
export class Sensor {
  @PrimaryGeneratedColumn({ name: 'Id_Sensor' })
  id: number;

  @Column({ name: 'Nombre', length: 20, nullable: true })
  nombre: string;

  @ManyToOne(() => Surco, (surco) => surco.sensores, { onDelete: 'CASCADE' })
  surco: Surco;

  @ManyToOne(() => TipoSensor, (tipoSensor) => tipoSensor.sensores, {
    onDelete: 'CASCADE',
  })
  tipoSensor: TipoSensor;

  @OneToMany(() => InformacionSensor, (info) => info.sensor)
  informaciones: InformacionSensor[];
}

