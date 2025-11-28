import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Subscripcion } from './subscripcion.entity';
import { Lote } from '../../lotes/entities/lote.entity';

@Entity('brokers')
export class Broker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 10, default: 'mqtt://' })
  protocolo: string;

  @Column({ type: 'varchar', length: 255 })
  host: string;

  @Column({ type: 'int' })
  puerto: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  usuario: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  prefijoTopicos: string;

  @Column({ type: 'json', nullable: true })
  topicosAdicionales: string[];

  @Column({ type: 'varchar', length: 10, default: 'Activo' })
  estado: 'Activo' | 'Inactivo';

  @ManyToMany(() => Lote, (lote) => lote.brokers)
  @JoinTable({
    name: 'lote_brokers',
    joinColumn: { name: 'brokerId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'loteId', referencedColumnName: 'id' }
  })
  lotes: Lote[];

  @OneToMany(() => Subscripcion, (sub) => sub.broker, {
    cascade: true,
    eager: true,
  })
  subscripciones: Subscripcion[];
}