import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { EpaTratamiento } from '../../epa_tratamiento/entities/epa_tratamiento.entity';
import { CultivoEpa } from '../../cultivos_epa/entities/cultivos_epa.entity';

@Entity('epa')
export class Epa {
  @PrimaryGeneratedColumn({ name: 'Id_Epa' })
  id: number;

  @Column({ name: 'Fecha_Encuentro', type: 'timestamp', nullable: true })
  fechaEncuentro: Date;

  @Column({ name: 'Nombre', length: 20, nullable: true })
  nombre: string;

  @Column({ name: 'Descripcion', length: 150, nullable: true })
  descripcion: string;

  @Column({ name: 'Tipo_Enfermedad', type: 'varchar', length: 50, nullable: true })
  tipoEnfermedad: string;

  @Column({ name: 'Deficiencias', length: 255, nullable: true })
  deficiencias: string;

  @Column({ name: 'Img', length: 255, nullable: true })
  img: string;

  @Column({ name: 'Complicaciones', length: 255, nullable: true })
  complicaciones: string;

  @OneToMany(() => CultivoEpa, (ce) => ce.epa)
  cultivos: CultivoEpa[];

  @OneToMany(() => EpaTratamiento, (et) => et.epa)
  tratamientos: EpaTratamiento[];
}

