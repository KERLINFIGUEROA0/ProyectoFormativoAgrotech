import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Lote } from '../../lotes/entities/lote.entity';
import { Cultivo } from '../../cultivos/entities/cultivo.entity';
import { Sensor } from '../../sensores/entities/sensore.entity';
import { Broker } from '../../mqtt-config/entities/broker.entity';

@Entity('surcos')
export class Surco {
  @PrimaryGeneratedColumn({ name: 'Id_Surco' })
  id: number;

  @Column({ name: 'Nombre', length: 15, nullable: true })
  nombre: string;

  @Column({ name: 'Descripcion', length: 150, nullable: true })
  descripcion: string;

  @Column({ name: 'Estado', type: 'varchar', length: 50, default: 'Disponible' })
  estado: string;

  @Column({ name: 'activo_mqtt', type: 'boolean', default: true })
  activo_mqtt: boolean;

  @ManyToOne(() => Lote, (lote) => lote.surcos, { onDelete: 'CASCADE' })
    lote: Lote;

  @ManyToOne(() => Cultivo, (cultivo) => cultivo.surcos, { onDelete: 'CASCADE', nullable: true })
    cultivo: Cultivo | null;

  @ManyToOne(() => Broker, { nullable: true, onDelete: 'SET NULL' })
  broker: Broker | null;

  @OneToMany(() => Sensor, (s) => s.surco)
  sensores: Sensor[];
}
