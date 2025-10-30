import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Sensor } from '../../sensores/entities/sensore.entity';

@Entity('tipo_sensor')
export class TipoSensor {
  @PrimaryGeneratedColumn({ name: 'Id_Tipo_Sensor' })
  id: number;

  @Column({ name: 'Nombre', length: 100, nullable: false })
  nombre: string;

  @OneToMany(() => Sensor, (sensor) => sensor.tipoSensor)
  sensores: Sensor[];
}
