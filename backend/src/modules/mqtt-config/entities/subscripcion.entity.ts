import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer'; // <--- 1. IMPORTAR ESTO
import { Broker } from './broker.entity';

@Entity('subscripciones')
export class Subscripcion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  topic: string;

  @Column({ type: 'int', default: 0 })
  qos: number;

  @Exclude() // <--- 2. AGREGAR ESTE DECORADOR
  @ManyToOne(() => Broker, (broker) => broker.subscripciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'broker_id' })
  broker: Broker;
}