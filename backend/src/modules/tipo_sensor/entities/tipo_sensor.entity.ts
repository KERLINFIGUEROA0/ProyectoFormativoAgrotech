import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_sensor')
export class TipoSensor {
  @PrimaryGeneratedColumn({ name: 'Id_Tipo_Sensor' })
  id: number;

  @Column({ name: 'Nombre', length: 100, nullable: false })
  nombre: string;

  // Nota: La relación con Sensor fue eliminada ya que los sensores ya no tienen tipoSensor
  // @OneToMany(() => Sensor, (sensor) => sensor.tipoSensor)
  // sensores: Sensor[];
}
