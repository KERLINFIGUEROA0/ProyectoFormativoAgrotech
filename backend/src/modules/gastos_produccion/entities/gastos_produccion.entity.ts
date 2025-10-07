import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Produccion } from '../../producciones/entities/produccione.entity';
import { TipoMovimiento } from '../../../common/enums/tipo-movimiento.enum';

@Entity('gastos')
export class Gasto {
  @PrimaryGeneratedColumn({ name: 'Id_Gasto' })
  id: number;

  @Column({ name: 'Descripcion', length: 255, nullable: false })
  descripcion: string;

  @Column({ name: 'Monto', type: 'decimal', nullable: false })
  monto: number;

  @Column({ name: 'Fecha', type: 'date', nullable: false })
  fecha: Date;

  @Column({ name: 'Tipo', type: 'enum', enum: TipoMovimiento, default: TipoMovimiento.EGRESO })
  tipo: TipoMovimiento;

  @ManyToOne(() => Produccion, (produccion) => produccion.gastos, { onDelete: 'CASCADE' })
  produccion: Produccion;
}

