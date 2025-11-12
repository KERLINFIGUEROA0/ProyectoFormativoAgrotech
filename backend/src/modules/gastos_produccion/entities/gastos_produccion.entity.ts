import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'; // Añade JoinColumn
import { Produccion } from '../../producciones/entities/produccione.entity';
import { TipoMovimiento } from '../../../common/enums/tipo-movimiento.enum';
import { Cultivo } from '../../cultivos/entities/cultivo.entity'; // <-- 1. IMPORTAR CULTIVO

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

  // --- 2. MODIFICAR PRODUCCION (hacerla opcional) ---
  @ManyToOne(() => Produccion, (produccion) => produccion.gastos, { 
    nullable: true, // <-- AÑADIR
    onDelete: 'CASCADE' 
  })
  produccion: Produccion | null; // <-- AÑADIR | null

  // --- 3. AÑADIR NUEVA RELACIÓN CON CULTIVO ---
  @ManyToOne(() => Cultivo, (cultivo) => cultivo.gastos, { 
    nullable: true, // <-- Hacerla opcional
    onDelete: 'SET NULL' // Si se borra el cultivo, el gasto queda pero sin asociación
  })
  @JoinColumn({ name: 'cultivoId' }) // Define la columna de la clave foránea
  cultivo: Cultivo | null;
}