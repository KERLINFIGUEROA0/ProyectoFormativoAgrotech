import {Entity,PrimaryGeneratedColumn,Column,ManyToOne,OneToMany,ManyToMany,JoinTable} from 'typeorm';
import { TipoCultivo } from '../../tipo_cultivo/entities/tipo_cultivo.entity';
import { Actividad } from '../../actividades/entities/actividade.entity';
import { Produccion } from '../../producciones/entities/produccione.entity';
import { Surco } from '../../surcos/entities/surco.entity';
import { CultivoEpa } from '../../cultivos_epa/entities/cultivos_epa.entity';

@Entity('cultivos')
export class Cultivo {
  @PrimaryGeneratedColumn({ name: 'Id_Cultivo' })
  id: number;

  @Column({ name: 'Nombre', length: 20 })
  nombre: string;

  @Column({ name: 'Cantidad', type: 'int' })
  cantidad: number;

  @Column({ name: 'TipoMedida', length: 20 })
  tipomedida: string;

  @Column({ name: 'Img', length: 255 })
  img: string;

  @Column({ name: 'Descripcion', length: 255, nullable: true })
  descripcion: string;

  @ManyToOne(() => TipoCultivo, (tipoCultivo) => tipoCultivo.cultivos, {
    onDelete: 'SET NULL',
  })
  tipoCultivo: TipoCultivo;

  @OneToMany(() => Actividad, (actividad) => actividad.cultivo)
  actividades: Actividad[];

  @OneToMany(() => Produccion, (produccion) => produccion.cultivo)
  producciones: Produccion[];

  @OneToMany(() => Surco, (surco) => surco.cultivo)
  surcos: Surco[];

@OneToMany(() => CultivoEpa, (ce) => ce.cultivo)
cultivosEpa: CultivoEpa[];

}

