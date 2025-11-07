import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Broker } from './broker.entity';

@Entity('subscripciones')
export class Subscripcion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  topic: string;

  @Column({ type: 'int', default: 0 })
  qos: number;

  @ManyToOne(() => Broker, (broker) => broker.subscripciones, {
    onDelete: 'CASCADE', // Si se borra el broker, se borran sus subscripciones
  })
  @JoinColumn({ name: 'broker_id' }) // Columna de la clave foránea
  broker: Broker;
}