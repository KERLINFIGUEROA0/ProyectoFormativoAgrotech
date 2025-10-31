import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Actividad } from '../../actividades/entities/actividade.entity';
import { Material } from '../../materiales/entities/materiale.entity';

@Entity('actividades_materiales')
export class ActividadMaterial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cantidad_usada', type: 'int', nullable: false })
  cantidadUsada: number;

  @ManyToOne(() => Actividad, (actividad) => actividad.actividadMaterial, { onDelete: 'CASCADE' })
  actividad: Actividad;

  @ManyToOne(() => Material, (material) => material.actividadMaterial, { onDelete: 'CASCADE' })
  material: Material;
}
