import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ActividadMaterial } from '../../actividades_materiales/entities/actividades_materiale.entity';

@Entity('materiales')
export class Material {
  @PrimaryGeneratedColumn({ name: 'Id_Material' })
  id: number;

  @Column({ name: 'Nombre', length: 20, nullable: true })
  nombre: string;

  @Column({ name: 'Precio', type: 'int', nullable: true })
  precio: number;

  @Column({ name: 'Descripcion', length: 150, nullable: true })
  descripcion: string;

  @Column({ name: 'Tipo_Material', type: 'varchar', length: 50, nullable: true })
  tipoMaterial: string;

  @Column({ name: 'Tipo_Medida_Material', type: 'varchar', length: 50, nullable: true })
  tipoMedida: string;

  @Column({ name: 'Cantidad', type: 'int', nullable: true })
  cantidad: number;

  @OneToMany(() => ActividadMaterial, (am) => am.material)
  actividadMaterial: ActividadMaterial[];
}

