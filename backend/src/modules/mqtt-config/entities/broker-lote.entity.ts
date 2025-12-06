import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Broker } from './broker.entity';
import { Lote } from '../../lotes/entities/lote.entity';

@Entity('broker_lotes')
export class BrokerLote {
  @PrimaryGeneratedColumn()
  id: number;

  // Relación con Broker
  @ManyToOne(() => Broker, (broker) => broker.brokerLotes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brokerId' })
  broker: Broker;

  // Relación con Lote
  @ManyToOne(() => Lote, (lote) => lote.brokerLotes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loteId' })
  lote: Lote;

  // AQUÍ está la clave: Los tópicos pertenecen a la relación, no al broker solo
  @Column({ type: 'json', nullable: true })
  topicos: string[];

  // Puerto opcional: si no se especifica, usa el del broker
  @Column({ type: 'int', nullable: true })
  puerto: number;

  // Topic de prueba opcional para verificar envío de datos
  @Column({ type: 'varchar', length: 100, nullable: true })
  topicPrueba: string;

  @Column({ default: true })
  isActive: boolean;
}