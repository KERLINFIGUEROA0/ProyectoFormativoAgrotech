// src/modules/producciones/entities/produccione.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Cultivo } from '../../cultivos/entities/cultivo.entity';
import { Venta } from '../../ventas/entities/venta.entity';
import { Gasto } from '../../gastos_produccion/entities/gastos_produccion.entity';

@Entity('producciones')
export class Produccion {
  @PrimaryGeneratedColumn({ name: 'Id_Produccion' })
  id: number;

  @Column({ name: 'Cantidad', type: 'int', nullable: true })
  cantidad: number;

  // --- ✅ AÑADIDO: Campo para mantener la cantidad original cosechada ---
  @Column({ name: 'Cantidad_Original', type: 'int', nullable: true })
  cantidadOriginal: number;

  @Column({ name: 'Fecha', type: 'timestamp', nullable: true })
  fecha: Date;

  // --- ✅ AÑADIDO: Campo de estado ---
  @Column({ name: 'Estado', type: 'varchar', length: 50, default: 'En Proceso' })
  estado: string;

  @ManyToOne(() => Cultivo, (cultivo) => cultivo.producciones, { onDelete: 'CASCADE' })
  cultivo: Cultivo;

  @OneToMany(() => Venta, (venta) => venta.produccion)
  ventas: Venta[];

  @OneToMany(() => Gasto, (gasto) => gasto.produccion)
  gastos: Gasto[];
}