// src/modules/lotes/entities/lote.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Sublote } from '../../sublotes/entities/sublote.entity';
import { BrokerLote } from '../../mqtt-config/entities/broker-lote.entity';

@Entity('lotes')
export class Lote {
  @PrimaryGeneratedColumn({ name: 'Id_Lote' })
  id: number;

  @Column({ name: 'Localizacion', type: 'int', nullable: true })
  localizacion: number;

  @Column({ name: 'Nombre', length: 100, nullable: true })
  nombre: string;

  @Column({
    name: 'Area',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  area: string;

  @Column({
    name: 'Estado',
    type: 'varchar',
    length: 50,
    default: 'En preparación',
    nullable: false,
  })
  estado: string;

  // --- CAMPO PARA COORDENADAS GEOESPACIALES ---
  @Column({
    name: 'coordenadas',
    type: 'jsonb', // Usamos JSONB para mejor rendimiento y consultas
    nullable: true,
  })
  coordenadas?: {
    type: 'point' | 'polygon';
    coordinates: { lat: number; lng: number } | Array<{ lat: number; lng: number }>;
  };

  @OneToMany(() => Sublote, (sublote) => sublote.lote)
  sublotes: Sublote[];

  // CAMBIA la relación @ManyToMany antigua por esta:
  @OneToMany(() => BrokerLote, (brokerLote) => brokerLote.lote)
  brokerLotes: BrokerLote[];
}
