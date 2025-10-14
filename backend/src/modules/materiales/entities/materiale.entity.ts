import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ActividadMaterial } from '../../actividades_materiales/entities/actividades_materiale.entity';

@Entity('materiales')
export class Material {
  @PrimaryGeneratedColumn({ name: 'Id_Material' })
  id: number;

  @Column({ name: 'Nombre', length: 50, nullable: false })
  nombre: string;

  @Column({ name: 'Precio', type: 'decimal', precision: 10, scale: 2, nullable: true })
  precio: number;

  @Column({ name: 'Descripcion', length: 255, nullable: true })
  descripcion: string;

  @Column({ name: 'Tipo_Material', type: 'varchar', length: 50, nullable: true })
  tipoMaterial: string;

  @Column({ name: 'Tipo_Medida_Material', type: 'varchar', length: 50, nullable: true })
  tipoMedida: string;

  @Column({ name: 'Cantidad', type: 'int', default: 0 })
  cantidad: number;
  
  @Column({ name: 'img', type: 'varchar', length: 255, nullable: true })
  img: string | null;

  @Column({ name: 'ubicacion_bodega', type: 'character varying', length: 100, nullable: true })
  ubicacion: string;

  @Column({ name: 'proveedor', type: 'character varying', length: 100, nullable: true })
  proveedor: string;

  @Column({ name: 'fecha_vencimiento', type: 'date', nullable: true })
  fechaVencimiento: Date;

  @OneToMany(() => ActividadMaterial, (am) => am.material)
  actividadMaterial: ActividadMaterial[];
} 