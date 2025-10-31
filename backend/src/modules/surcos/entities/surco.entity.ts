import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Lote } from '../../lotes/entities/lote.entity';
import { Cultivo } from '../../cultivos/entities/cultivo.entity';
import { Sensor } from '../../sensores/entities/sensore.entity';

@Entity('surcos')
export class Surco {
  @PrimaryGeneratedColumn({ name: 'Id_Surco' })
  id: number;

  @Column({ name: 'Nombre', length: 15, nullable: true })
  nombre: string;

  @Column({ name: 'Descripcion', length: 150, nullable: true })
  descripcion: string;

  // --- CAMPO AÑADIDO ---
  @Column({ name: 'Estado', type: 'varchar', length: 50, default: 'Disponible' })
  estado: string;

  @ManyToOne(() => Lote, (lote) => lote.surcos, { onDelete: 'CASCADE' })
    lote: Lote;

  @ManyToOne(() => Cultivo, (cultivo) => cultivo.surcos, { onDelete: 'CASCADE' })
    cultivo: Cultivo;

  @OneToMany(() => Sensor, (s) => s.surco)
  sensores: Sensor[];
}
