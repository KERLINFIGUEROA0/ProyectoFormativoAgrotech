import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Cultivo } from '../../cultivos/entities/cultivo.entity';


@Entity('tipo_cultivo')
export class TipoCultivo {
@PrimaryGeneratedColumn({ name: 'Id_Tipo_Cultivo' })
id: number;


@Column({ name: 'Nombre', length: 20  })
nombre: string;


@Column({ name: 'Descripcion', length: 150, nullable: true })
descripcion: string;


  @OneToMany(() => Cultivo, (cultivo) => cultivo.tipoCultivo)
  cultivos: Cultivo[];
}