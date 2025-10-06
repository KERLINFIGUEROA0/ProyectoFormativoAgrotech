import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tratamiento } from '../../tratamientos/entities/tratamiento.entity';
import { Epa } from '../../epa/entities/epa.entity';


@Entity('epa_tratamiento')
export class EpaTratamiento {
@PrimaryGeneratedColumn({ name: 'Id_Epa_Tratamiento' })
id: number;


@ManyToOne(() => Tratamiento, (t) => t.epaTratamientos, { nullable: true })
@JoinColumn({ name: 'Id_Tratamiento' })
tratamiento: Tratamiento | null;


@ManyToOne(() => Epa, (e) => e.tratamientos, { nullable: true })
@JoinColumn({ name: 'Id_Epa' })
epa: Epa | null;
}
