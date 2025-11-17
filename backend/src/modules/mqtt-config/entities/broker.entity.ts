import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Subscripcion } from './subscripcion.entity';
import { Surco } from '../../surcos/entities/surco.entity';

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

  @Column({ type: 'int', nullable: true })
  surcoId: number;

  @ManyToOne(() => Surco, { nullable: true })
  @JoinColumn({ name: 'surcoId' })
  surco: Surco;

  @Column({ type: 'varchar', length: 255, nullable: true })
  prefijoTopicos: string;

  @Column({ type: 'json', nullable: true })
  topicosAdicionales: string[];

  @Column({ type: 'varchar', length: 10, default: 'Activo' })
  estado: 'Activo' | 'Inactivo';

  @OneToMany(() => Subscripcion, (sub) => sub.broker, {
    cascade: true,
    eager: true, // Carga automáticamente las subscripciones
  })
  subscripciones: Subscripcion[];
}