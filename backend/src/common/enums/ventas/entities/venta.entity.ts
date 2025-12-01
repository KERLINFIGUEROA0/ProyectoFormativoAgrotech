import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Produccion } from '../../../../modules/producciones/entities/produccione.entity';

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn({ name: 'Id_Venta' })
  id: number;

  @Column({ name: 'Descripcion', type: 'varchar', length: 255, nullable: true })
  descripcion: string;

  @Column({ name: 'Fecha', type: 'date' })
  fecha: Date;

  // --- CORRECCIÓN ---
  // Aseguramos que todas las propiedades usen camelCase (inicio con minúscula).
  @Column({ name: 'Precio_Unitario', type: 'decimal', precision: 10, scale: 2, default: 0 })
  precioUnitario: number;

  @Column({ name: 'Cantidad_Venta', type: 'int' })
  cantidadVenta: number;

  @Column({ name: 'Valor_Total_Venta', type: 'decimal', precision: 10, scale: 2 })
  valorTotalVenta: number;
  // --- FIN DE LA CORRECCIÓN ---

  @ManyToOne(() => Produccion, (produccion) => produccion.ventas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'produccionId' })
  produccion: Produccion;
}