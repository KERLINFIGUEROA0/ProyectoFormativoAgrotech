import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Actividad } from './actividade.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('actividad_usuario')
export class ActividadUsuario {
  @PrimaryGeneratedColumn({ name: 'Id_Actividad_Usuario' })
  id: number;

  @ManyToOne(() => Actividad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_actividad' })
  actividad: Actividad;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario', referencedColumnName: 'identificacion' })
  usuario: Usuario;
}