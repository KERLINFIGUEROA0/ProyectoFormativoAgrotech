import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Usuario } from '../../../modules/usuarios/entities/usuario.entity';

@Entity('fichas')
export class Ficha {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ name: 'id_ficha', length: 8, unique: true })
  id_ficha: string;

  @OneToMany(() => Usuario, (usuario) => usuario.ficha)
  usuarios: Usuario[];
}
