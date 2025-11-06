import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TipoUsuario } from '../../tipo_usuario/entities/tipo_usuario.entity';
import { Actividad } from '../../actividades/entities/actividade.entity';
import { UsuarioPermiso } from '../../usuarios_permisos/entities/usuarios_permiso.entity';
import { Ficha } from '../../../modules/fichas/entities/ficha.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn({ name: 'Id_Usuario' })
  id: number;

  @Column({ name: 'Tipo_Identificacion', length: 20 })
  Tipo_Identificacion: string;

  @Column({
    name: 'Id_Identificacion',
    type: 'bigint',
    unique: true,
  })
  identificacion: number;

  @Column({ nullable: true })
  foto: string;

  @Column({ name: 'Nombre', length: 20 })
  nombre: string;

  @Column({ name: 'Apellidos', length: 30 })
  apellidos: string;

  @Column({ name: 'Telefono', length: 15 })
  telefono: string;

  @Column({ name: 'Correo', length: 40 })
  correo: string;

  @Column({ name: 'Password_Hash', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetExpira: Date | null;

  @Column({ default: true })
  estado: boolean;

  @ManyToOne(() => TipoUsuario, (tipoUsuario) => tipoUsuario.usuarios)
  tipoUsuario: TipoUsuario;

  @ManyToOne(() => Ficha, (ficha) => ficha.usuarios, { nullable: true })
  @JoinColumn({ name: 'id_ficha' })
  ficha: Ficha;

  @OneToMany(() => Actividad, (actividad) => actividad.usuario)
  actividades: Actividad[];

  @OneToMany(() => UsuarioPermiso, (usuarioPermiso) => usuarioPermiso.usuario)
  usuarioPermisos: UsuarioPermiso[];
}

