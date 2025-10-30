import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { RolPermiso } from '../../rol_permiso/entities/rol_permiso.entity';

@Entity('tipo_usuario')
export class TipoUsuario {
  @PrimaryGeneratedColumn({ name: 'Id_Tipo_Usuario' })
  id: number;

  @Column({ name: 'Nombre', length: 20, nullable: false })
  nombre: string;

  @Column({ name: 'Descripcion', length: 150, nullable: true })
  descripcion: string;

  @OneToMany(() => Usuario, (usuario) => usuario.tipoUsuario)
  usuarios: Usuario[];

  @OneToMany(() => RolPermiso, (rolPermiso) => rolPermiso.tipoUsuario)
  rolPermisos: RolPermiso[];
}

