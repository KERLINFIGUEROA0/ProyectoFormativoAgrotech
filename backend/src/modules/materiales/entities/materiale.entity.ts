import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ActividadMaterial } from '../../actividades_materiales/entities/actividades_materiale.entity';
import { UnidadMedida } from '../../../common/enums/unidad-medida.enum';
import { TipoMaterial } from '../../../common/enums/tipo-material.enum';

@Entity('materiales')
export class Material {
  @PrimaryGeneratedColumn({ name: 'Id_Material' })
  id: number;

  @Column({ name: 'Nombre', type: 'varchar', length: 50, nullable: false })
  nombre: string;

  @Column({ name: 'Precio', type: 'numeric', precision: 10, scale: 2, nullable: true })
  precio: number;

  @Column({ name: 'Descripcion', type: 'varchar', length: 255, nullable: true })
  descripcion: string;

  @Column({
    name: 'Tipo_Material',
    type: 'enum',
    enumName: 'tipo_material_enum', // Asegura que TypeORM use el tipo de la DB
    enum: TipoMaterial,
    nullable: true,
  })
  tipoMaterial: TipoMaterial;

  @Column({
    name: 'Tipo_Medida_Material',
    type: 'enum',
    enumName: 'unidad_medida_enum', // Asegura que TypeORM use el tipo de la DB
    enum: UnidadMedida,
    nullable: true,
  })
  tipoMedida: UnidadMedida;

  @Column({ name: 'peso_por_unidad_kg', type: 'numeric', precision: 10, scale: 3, nullable: true })
  pesoPorUnidad: number | null;

  @Column({ name: 'Cantidad', type: 'integer', default: 0 })
  cantidad: number;
  
  @Column({ name: 'img', type: 'varchar', length: 255, nullable: true })
  img: string | null;

  @Column({ name: 'ubicacion_bodega', type: 'varchar', length: 100, nullable: true })
  ubicacion: string | null;

  @Column({ name: 'proveedor', type: 'varchar', length: 100, nullable: true })
  proveedor: string | null;

  @Column({ name: 'fecha_vencimiento', type: 'date', nullable: true })
  fechaVencimiento: Date | null;

  @OneToMany(() => ActividadMaterial, (am) => am.material)
  actividadMaterial: ActividadMaterial[];
}