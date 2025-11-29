import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, DeleteDateColumn } from 'typeorm';
import { Lote } from '../../lotes/entities/lote.entity';
import { Cultivo } from '../../cultivos/entities/cultivo.entity';
import { Sensor } from '../../sensores/entities/sensore.entity';

@Entity('sublotes')
export class Sublote {
  @PrimaryGeneratedColumn({ name: 'Id_Sublote' })
  id: number;

  @Column({ name: 'Nombre', length: 100, nullable: true })
  nombre: string;


  @Column({ name: 'Estado', type: 'varchar', length: 50, default: 'Disponible' })
  estado: string;

  // --- CAMPO PARA COORDENADAS GEOESPACIALES ---
  @Column({
    name: 'coordenadas',
    type: 'jsonb',
    nullable: true,
  })
  coordenadas?: {
    type: 'point' | 'polygon';
    coordinates: { lat: number; lng: number } | Array<{ lat: number; lng: number }>;
  };

  @Column({ name: 'activo_mqtt', type: 'boolean', default: true })
  activo_mqtt: boolean;

  @ManyToOne(() => Lote, (lote) => lote.sublotes, { onDelete: 'CASCADE' })
  lote: Lote;

  @ManyToOne(() => Cultivo, (cultivo) => cultivo.sublotes, { onDelete: 'SET NULL', nullable: true })
  cultivo: Cultivo | null;

  @OneToMany(() => Sensor, (s) => s.sublote)
  sensores: Sensor[];

  // Agrega esta columna mágica.
  // Cuando llames a .softDelete(), TypeORM pondrá la fecha aquí en lugar de borrar la fila.
  @DeleteDateColumn({ select: false }) // select: false para que no salga en las consultas normales por defecto
  deletedAt?: Date;
}
