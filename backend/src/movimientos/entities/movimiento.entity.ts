import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Material } from '../../modules/materiales/entities/materiale.entity';
import { Usuario } from '../../modules/usuarios/entities/usuario.entity';
import { TipoMovimiento } from '../../common/enums/tipo-movimiento.enum';

@Entity('movimientos')
export class Movimiento {
  @PrimaryGeneratedColumn({ name: 'Id_Movimiento' })
  id: number;

  @Column({ name: 'tipo', type: 'enum', enum: TipoMovimiento })
  tipo: TipoMovimiento;

  @Column({ name: 'cantidad', type: 'numeric', precision: 10, scale: 2, nullable: true })
  cantidad: number;

  @Column({ name: 'descripcion', type: 'varchar', length: 255, nullable: true })
  descripcion: string;

  @Column({ name: 'fecha', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({ name: 'referencia', type: 'varchar', length: 100, nullable: true })
  referencia: string; // ID de actividad, compra, etc.

  @ManyToOne(() => Material, { nullable: true })
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}