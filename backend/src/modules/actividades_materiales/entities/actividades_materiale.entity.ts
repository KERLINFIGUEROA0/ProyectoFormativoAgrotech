import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Actividad } from '../../actividades/entities/actividade.entity';
import { Material } from '../../materiales/entities/materiale.entity';
import { UnidadMedida } from '../../../common/enums/unidad-medida.enum';

@Entity('actividades_materiales')
export class ActividadMaterial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cantidad_usada', type: 'numeric', precision: 10, scale: 3, nullable: true })
  cantidadUsada?: number;

  @Column({
    name: 'unidad_medida',
    type: 'enum',
    enumName: 'unidad_medida_enum',
    enum: UnidadMedida,
    nullable: true
  })
  unidadMedida?: UnidadMedida;

  @Column({ name: 'cantidad_usada_base', type: 'numeric', precision: 10, scale: 3, nullable: true })
  cantidadUsadaBase: number;

  @Column({ name: 'costo', type: 'numeric', precision: 10, scale: 2, nullable: true })
  costo: number;

  @ManyToOne(() => Actividad, (actividad) => actividad.actividadMaterial, { onDelete: 'CASCADE' })
  actividad: Actividad;

  @ManyToOne(() => Material, (material) => material.actividadMaterial, { onDelete: 'CASCADE' })
  material: Material;
}
