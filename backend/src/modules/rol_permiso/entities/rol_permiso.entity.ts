import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { TipoUsuario } from "../../tipo_usuario/entities/tipo_usuario.entity";
import { Permiso } from "../../permisos/entities/permiso.entity";

@Entity("rol_permisos")
export class RolPermiso {
  @PrimaryGeneratedColumn()
  id_rol_permiso: number;

  @ManyToOne(() => TipoUsuario, (tipoUsuario) => tipoUsuario.rolPermisos, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tipo_usuario_id" })
  tipoUsuario: TipoUsuario;

  @ManyToOne(() => Permiso, { eager: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "permiso_id" })
  permiso: Permiso;
}
