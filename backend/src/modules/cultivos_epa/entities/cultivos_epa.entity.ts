import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Cultivo } from '../../cultivos/entities/cultivo.entity';
import { Epa } from '../../epa/entities/epa.entity';


@Entity('cultivos_epa')
export class CultivoEpa {
@PrimaryGeneratedColumn({ name: 'Id_Cultivo_Epa' })
id: number;


@ManyToOne(() => Cultivo, (c) => c.cultivosEpa, { nullable: true })
@JoinColumn({ name: 'Id_Cultivo' })
cultivo: Cultivo | null;


@ManyToOne(() => Epa, (e) => e.cultivos, { nullable: true })
@JoinColumn({ name: 'Id_Epa' })
epa: Epa | null;
}
