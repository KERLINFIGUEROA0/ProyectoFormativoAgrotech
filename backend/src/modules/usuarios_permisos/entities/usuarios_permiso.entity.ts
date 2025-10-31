import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Permiso } from '../../permisos/entities/permiso.entity';

@Entity('usuario_permisos')
export class UsuarioPermiso {
  @PrimaryGeneratedColumn()
  id_usuario_permiso: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.usuarioPermisos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => Permiso, (permiso) => permiso.usuarioPermisos, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permiso_id' })
  permiso: Permiso;
}
