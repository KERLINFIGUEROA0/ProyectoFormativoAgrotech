import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Sensor } from '../../sensores/entities/sensore.entity';
import { Lote } from '../../lotes/entities/lote.entity';

@Entity('informacion_sensor')
export class InformacionSensor {
  @PrimaryGeneratedColumn({ name: 'Id_Informacion_Sensor' })
  id: number;

  @CreateDateColumn({ name: 'Fecha_Registro', type: 'timestamp' })
  fechaRegistro: Date; // Tu nombre original

  // ✅ NUEVO: Para guardar el nombre del sensor dinámico
  @Column({ name: 'Sensor_Key', type: 'varchar', length: 100, nullable: true })
  sensorKey: string;

  @Column({ name: 'Valor', type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ name: 'Unidad', type: 'varchar', length: 20, nullable: true })
  unidad: string;

  // ✅ NUEVO: Relación con Lote
  @ManyToOne(() => Lote, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'Id_Lote' })
  lote: Lote;

  @Column({ nullable: true })
  loteId: number; // ID numérico para referencia rápida

  // Relación opcional con Sensor antiguo
  @ManyToOne(() => Sensor, (sensor) => sensor.informaciones, {
    onDelete: 'CASCADE',
    nullable: true
  })
  sensor: Sensor;

  @Column({ name: 'Tipo', type: 'varchar', length: 20, default: 'regular' })
  tipo: string;
}