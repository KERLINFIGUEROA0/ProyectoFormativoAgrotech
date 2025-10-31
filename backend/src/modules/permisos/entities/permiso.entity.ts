import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { RolPermiso } from '../../rol_permiso/entities/rol_permiso.entity';
import { UsuarioPermiso } from '../../usuarios_permisos/entities/usuarios_permiso.entity';
import { Modulo } from '../../modulos/entities/modulo.entity';

@Entity('permisos')
export class Permiso {
  @PrimaryGeneratedColumn({ name: 'id_permiso' })
  id: number;

  @Column({ name: 'nombre', type: 'varchar', length: 50 })
  nombre: string;

  @Column({ name: 'descripcion', type: 'varchar', length: 150, nullable: true })
  descripcion: string;

  @ManyToOne(() => Modulo, (modulo) => modulo.permisos)
  @JoinColumn({ name: 'Id_Modulo' })
  modulo: Modulo;

  @OneToMany(() => RolPermiso, (rolPermiso) => rolPermiso.permiso)
  rolPermisos: RolPermiso[];

  @OneToMany(() => UsuarioPermiso, (usuarioPermiso) => usuarioPermiso.permiso)
  usuarioPermisos: UsuarioPermiso[];
}

