import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ActividadMaterial } from '../../actividades_materiales/entities/actividades_materiale.entity';
// Importamos los nuevos enums que debes crear en tu backend
import { TipoCategoria } from '../../../common/enums/tipo-categoria.enum';
import { TipoMaterial } from '../../../common/enums/tipo-material.enum';
import { MedidasDeContenido } from '../../../common/enums/unidad-contenido.enum';
import { TipoEmpaque } from '../../../common/enums/tipo-empaque.enum';

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

  @Column({ name: 'peso_por_unidad_kg', type: 'numeric', precision: 10, scale: 3, nullable: true })
  pesoPorUnidad: number | null;
  
  @Column({ name: 'estado', type: 'boolean', default: true })
  estado: boolean;
  

  // --- NUEVAS COLUMNAS ---
  @Column({
    name: 'Tipo_Categoria',
    type: 'enum',
    enumName: 'tipo_categoria_enum',
    enum: TipoCategoria,
    nullable: true,
  })
  tipoCategoria: TipoCategoria;

  @Column({
    name: 'Tipo_Material',
    type: 'enum',
    enumName: 'tipo_material_enum',
    enum: TipoMaterial,
    nullable: true,
  })
  tipoMaterial: TipoMaterial;

  @Column({
    name: 'Medidas_De_Contenido',
    type: 'enum',
    enumName: 'medidas_de_contenido_enum',
    enum: MedidasDeContenido,
    nullable: true,
  })
  medidasDeContenido: MedidasDeContenido;

  @Column({
    name: 'Tipo_Empaque',
    type: 'enum',
    enumName: 'tipo_empaque_enum',
    enum: TipoEmpaque,
    nullable: true,
  })
  tipoEmpaque: TipoEmpaque;

  @OneToMany(() => ActividadMaterial, (am) => am.material)
  actividadMaterial: ActividadMaterial[];
}