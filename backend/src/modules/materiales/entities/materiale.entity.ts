import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ActividadMaterial } from '../../actividades_materiales/entities/actividades_materiale.entity';
// Importamos los nuevos enums que debes crear en tu backend
import { TipoCategoria } from '../../../common/enums/tipo-categoria.enum';
import { TipoMaterial } from '../../../common/enums/tipo-material.enum';
import { MedidasDeContenido } from '../../../common/enums/unidad-contenido.enum';
import { TipoEmpaque } from '../../../common/enums/tipo-empaque.enum';
import { TipoConsumo } from '../../../common/enums/tipo-consumo.enum';
import { UnidadMedida } from '../../../common/enums/unidad-medida.enum';

// --- TRANSFORMER PARA CONVERTIR STRINGS DE POSTGRES A NÚMEROS ---
const numericTransformer = {
  to: (data: number) => data,
  from: (data: string) => parseFloat(data), // Convierte "50.000" a 50
};

@Entity('materiales')
export class Material {
  @PrimaryGeneratedColumn({ name: 'Id_Material' })
  id: number;

  @Column({ name: 'Nombre', type: 'varchar', length: 50, nullable: false })
  nombre: string;

  @Column({
    name: 'Precio',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer
  })
  precio: number;

  @Column({ name: 'Descripcion', type: 'varchar', length: 255, nullable: true })
  descripcion: string;

  @Column({
    name: 'Cantidad',
    type: 'numeric',
    precision: 14, // Aumentamos precisión total
    scale: 6,      // 6 decimales: 0.000001 para soportar miligramos exactos
    default: 0,
    transformer: numericTransformer
  })
  cantidad: number;

  @Column({ name: 'img', type: 'varchar', length: 255, nullable: true })
  img: string | null;

  @Column({ name: 'ubicacion_bodega', type: 'varchar', length: 100, nullable: true })
  ubicacion: string | null;

  @Column({ name: 'proveedor', type: 'varchar', length: 100, nullable: true })
  proveedor: string | null;

  @Column({ name: 'fecha_vencimiento', type: 'date', nullable: true })
  fechaVencimiento: Date | null;

  @Column({
    name: 'peso_por_unidad_kg',
    type: 'numeric',
    precision: 12,
    scale: 6, // También aumentamos aquí por si el paquete pesa miligramos
    nullable: true,
    transformer: numericTransformer
  })
  pesoPorUnidad: number | null;
  
  @Column({ name: 'estado', type: 'boolean', default: true })
  estado: boolean;

  @Column({
    name: 'tipo_consumo',
    type: 'enum',
    enumName: 'tipo_consumo_enum',
    enum: TipoConsumo,
    default: TipoConsumo.CONSUMIBLE,
    nullable: false,
  })
  tipoConsumo: TipoConsumo;

  @Column({ name: 'cantidad_por_unidad', type: 'numeric', precision: 10, scale: 3, nullable: true })
  cantidadPorUnidad: number | null;

  @Column({ name: 'cantidad_restante_unidad_actual', type: 'numeric', precision: 10, scale: 3, nullable: true })
  cantidadRestanteEnUnidadActual: number | null;

  @Column({ name: 'usos_totales', type: 'integer', nullable: true })
  usosTotales: number | null;

  @Column({ name: 'usos_actuales', type: 'numeric', precision: 10, scale: 3, default: 0 })
  usosActuales: number;

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

  // Nueva columna para rastrear la unidad base del material
  @Column({
    name: 'unidad_base',
    type: 'enum',
    enumName: 'unidad_medida_enum',
    enum: UnidadMedida,
    nullable: true,
    comment: 'Unidad base para conversiones (Kg, L, Unidad)'
  })
  unidadBase: UnidadMedida;

  @OneToMany(() => ActividadMaterial, (am) => am.material)
  actividadMaterial: ActividadMaterial[];
}