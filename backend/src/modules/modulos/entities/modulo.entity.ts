import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Permiso } from '../../permisos/entities/permiso.entity';

@Entity('modulos')
export class Modulo {
  @PrimaryGeneratedColumn({ name: 'Id_Modulo' })
  id: number;

  @Column({ name: 'Nombre', length: 50 })
  nombre: string;

  @Column({ name: 'Descripcion', length: 150, nullable: true })
  descripcion: string;

  @OneToMany(() => Permiso, (permiso) => permiso.modulo)
  permisos: Permiso[];
}

