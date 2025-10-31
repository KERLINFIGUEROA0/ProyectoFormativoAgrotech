import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { EpaTratamiento } from "../../epa_tratamiento/entities/epa_tratamiento.entity";

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

  @OneToMany(() => EpaTratamiento, (et) => et.tratamiento)
  epaTratamientos: EpaTratamiento[];
}

