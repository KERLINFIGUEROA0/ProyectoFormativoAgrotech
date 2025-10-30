import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Produccion } from '../../producciones/entities/produccione.entity';
import { TipoMovimiento } from '../../../common/enums/tipo-movimiento.enum';

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn({ name: 'Id_Venta' })
  id: number;

  @Column({ name: 'Descripcion', type: 'varchar', length: 255, nullable: true })
  descripcion: string;

  @Column({ name: 'Fecha', type: 'date' })
  fecha: string;

  @Column({ name: 'Precio_Unitario', type: 'decimal', precision: 10, scale: 2, default: 0 })
  precioUnitario: number;

  @Column({ name: 'Cantidad_Venta', type: 'int' })
  cantidadVenta: number;

  @Column({ name: 'Valor_Total_Venta', type: 'decimal', precision: 10, scale: 2 })
  valorTotalVenta: number;

  // --- AÑADIR ESTE NUEVO CAMPO ---
  @Column({ name: 'Ruta_Factura_Pdf', type: 'varchar', length: 255, nullable: true })
  rutaFacturaPdf: string;
  // --- FIN DEL CAMPO ---

  @Column({ name: 'Tipo', type: 'enum', enum: TipoMovimiento, default: TipoMovimiento.INGRESO })
  tipo: TipoMovimiento;

  @ManyToOne(() => Produccion, (produccion) => produccion.ventas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'produccionId' })
  produccion: Produccion;
}