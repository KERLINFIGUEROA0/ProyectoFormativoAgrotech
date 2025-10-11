import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,JoinColumn} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Cultivo } from '../../cultivos/entities/cultivo.entity';
import { ActividadMaterial } from '../../actividades_materiales/entities/actividades_materiale.entity';


@Entity('actividades')
export class Actividad {
  @PrimaryGeneratedColumn({ name: 'Id_Actividad' })
  id: number;

  @Column({ name: 'Titulo', length: 40, nullable: true })
  titulo: string;

  @Column({ name: 'Fecha', type: 'date', nullable: true })
  fecha: Date;

  @Column({ name: 'Descripcion', length: 250, nullable: true })
  descripcion: string;

   @Column({ name: 'Img', type: 'text', nullable: true })
  img: string;

@ManyToOne(() => Usuario, (u) => u.actividades, { nullable: true })
@JoinColumn({ name: 'Id_Identificacion', referencedColumnName: 'identificacion' })
usuario: Usuario | null;

 @ManyToOne(() => Cultivo, (cultivo) => cultivo.actividades, { onDelete: 'CASCADE' })
  cultivo: Cultivo;

  @OneToMany(() => ActividadMaterial, (am) => am.actividad)
  actividadMaterial: ActividadMaterial[];

  @Column({
    type: 'enum',
    enum: ['pendiente', 'en proceso', 'completado'],
    default: 'pendiente',
  })
  estado: 'pendiente' | 'en proceso' | 'completado';
}

