import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Produccion } from '../../producciones/entities/produccione.entity';

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

  @Column({ type: 'varchar', default: 'egreso' }) 
  tipo: string; 

  @ManyToOne(() => Produccion, (produccion) => produccion.gastos, { onDelete: 'CASCADE' })
  produccion: Produccion;
}

