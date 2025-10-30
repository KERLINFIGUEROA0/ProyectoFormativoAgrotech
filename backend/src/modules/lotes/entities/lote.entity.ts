// src/modules/lotes/entities/lote.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Surco } from '../../surcos/entities/surco.entity';

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

  // --- NUEVO CAMPO PARA EL POLÍGONO ---
  @Column({
    name: 'coordenadas_poligono',
    type: 'json', // Usamos JSON para almacenar el arreglo de coordenadas
    nullable: true,
  })
  coordenadasPoligono?: Array<{ lat: number; lng: number }>;

  @OneToMany(() => Surco, (surco) => surco.lote)
  surcos: Surco[];
}
