import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Sensor } from '../../sensores/entities/sensore.entity';

@Entity('informacion_sensor')
export class InformacionSensor {
  @PrimaryGeneratedColumn({ name: 'Id_Informacion_Sensor' })
  id: number;

  // ✅ CAMBIO: Se usa CreateDateColumn para que la BD ponga la fecha automáticamente
  @CreateDateColumn({ name: 'Fecha_Registro', type: 'timestamp' })
  fechaRegistro: Date;

  // ✅ NUEVO: Cn multes25.5)
  @Column({ name: 'Valor', type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  // ❌ ELIMINADOS: valorMaximo y valorMinimo

  @ManyToOne(() => Sensor, (sensor) => sensor.informaciones, {
    onDelete: 'CASCADE',
  })
  sensor: Sensor;
}