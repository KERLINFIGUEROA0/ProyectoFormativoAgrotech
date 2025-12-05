import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Subscripcion } from './subscripcion.entity';
import { BrokerLote } from './broker-lote.entity';

@Entity('brokers')
export class Broker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre: string;

  @Column({ type: 'enum', enum: ['mqtt', 'mqtts', 'http', 'https', 'ws', 'wss'], default: 'mqtt' })
  protocolo: 'mqtt' | 'mqtts' | 'http' | 'https' | 'ws' | 'wss';

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

  @Column({ type: 'varchar', length: 10, default: 'Activo' })
  estado: 'Activo' | 'Inactivo';

  // ✅ NUEVO: Umbrales dinámicos (JSON)
  @Column({ type: 'json', nullable: true })
  umbrales: Record<string, { minimo: number; maximo: number }>;

  // ✅ SSL/TLS Configuration
  @Column({ type: 'json', nullable: true })
  sslConfig: {
    enabled: boolean;
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };

  @OneToMany(() => BrokerLote, (brokerLote) => brokerLote.broker)
  brokerLotes: BrokerLote[];

  @OneToMany(() => Subscripcion, (sub) => sub.broker, {
    cascade: true,
    eager: true,
  })
  subscripciones: Subscripcion[];
}