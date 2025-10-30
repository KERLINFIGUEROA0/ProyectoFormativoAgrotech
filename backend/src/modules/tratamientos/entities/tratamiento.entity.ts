import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne,JoinColumn } from 'typeorm';
import { EpaTratamiento } from "../../epa_tratamiento/entities/epa_tratamiento.entity";
import { Cultivo } from '../../cultivos/entities/cultivo.entity';

@Entity('tratamientos')
export class Tratamiento {
  @PrimaryGeneratedColumn({ name: 'Id_Tratamiento' })
  id: number;

  @Column({ name: 'Descripcion', length: 150, nullable: true })
  descripcion: string;

  @Column({ name: 'Fecha_Final', type: 'timestamp', nullable: true })
  fechaFinal: Date;

  @Column({ name: 'Fecha_Inicio', type: 'timestamp', nullable: true })
  fechaInicio: Date;

  @Column({ name: 'Tipo_Tratamiento', type: 'varchar', length: 50, nullable: true })
  tipo: string;

   // --- ✅ CAMBIO AÑADIDO ---
  @Column({ name: 'Estado', type: 'varchar', length: 50, default: 'Planificado' })
  estado: string; // Puede ser 'Planificado', 'En Curso', 'Finalizado'
  // --- FIN DEL CAMBIO ---
  @ManyToOne(() => Cultivo, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cultivoId' }) // Especificamos el nombre de la columna de clave foránea
  cultivo: Cultivo | null;

  @OneToMany(() => EpaTratamiento, (et) => et.tratamiento)
  epaTratamientos: EpaTratamiento[];

}

