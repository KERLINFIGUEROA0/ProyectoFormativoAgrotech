import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Sensor } from '../../sensores/entities/sensore.entity';

@Entity('informacion_sensor')
export class InformacionSensor {
  @PrimaryGeneratedColumn({ name: 'Id_Informacion_Sensor' })
  id: number;

  @Column({ name: 'Fecha_Registro', type: 'timestamp', nullable: false })
  fechaRegistro: Date;

  @Column({ name: 'Valor_Maximo', type: 'int', nullable: true })
  valorMaximo?: number;

  @Column({ name: 'Valor_Minimo', type: 'int', nullable: true })
  valorMinimo?: number;

  @ManyToOne(() => Sensor, (sensor) => sensor.informaciones, { onDelete: 'CASCADE' })
  sensor: Sensor;
}
