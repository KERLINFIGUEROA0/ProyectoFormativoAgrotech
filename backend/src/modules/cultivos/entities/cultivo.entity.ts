import {Entity,PrimaryGeneratedColumn,Column,ManyToOne,OneToMany,ManyToMany,JoinTable,JoinColumn} from 'typeorm';
import { TipoCultivo } from '../../tipo_cultivo/entities/tipo_cultivo.entity';
import { Actividad } from '../../actividades/entities/actividade.entity';
import { Produccion } from '../../producciones/entities/produccione.entity';
import { Sublote } from '../../sublotes/entities/sublote.entity';
import { CultivoEpa } from '../../cultivos_epa/entities/cultivos_epa.entity';
import { Gasto } from '../../gastos_produccion/entities/gastos_produccion.entity';
import { Lote } from '../../lotes/entities/lote.entity'; // IMPORTAR LOTE
import { dateColumnTransformer } from '../../../common/transformers/date-column.transformer';

@Entity('cultivos')
export class Cultivo {
  // ... (todas las demás propiedades como id, nombre, cantidad, etc. quedan igual) ...
  @PrimaryGeneratedColumn({ name: 'Id_Cultivo' })
  id: number;

  @Column({ name: 'Nombre', length: 20 })
  nombre: string;
  
  @Column({ name: 'Cantidad', type: 'int' })
  cantidad: number;

  @Column({ name: 'Cantidad_Cosechada', type: 'int', default: 0 })
  cantidad_cosechada: number;

  @Column({ name: 'Img', length: 255 })
  img: string;

  @Column({ name: 'Descripcion', length: 255, nullable: true })
  descripcion: string;
  
  @Column({ name: 'Estado', length: 50, nullable: true })
  Estado: string;

  @Column({
    name: 'Fecha_Plantado',
    type: 'date',
    nullable: true,
    transformer: dateColumnTransformer
  })
  Fecha_Plantado: Date;

  @Column({
    name: 'Fecha_Fin',
    type: 'date',
    nullable: true,
    transformer: dateColumnTransformer
  })
  Fecha_Fin: Date | null;

  @ManyToOne(() => TipoCultivo, (tipoCultivo) => tipoCultivo.cultivos, {
    onDelete: 'SET NULL',
  })
  tipoCultivo: TipoCultivo;

  // --- NUEVA RELACIÓN: Un Cultivo pertenece a un Lote ---
  @ManyToOne(() => Lote, { nullable: true })
  @JoinColumn({ name: 'loteId' })
  lote: Lote;
  // -----------------------------------------------------

  @OneToMany(() => Actividad, (actividad) => actividad.cultivo)
  actividades: Actividad[];

  @OneToMany(() => Produccion, (produccion) => produccion.cultivo)
  producciones: Produccion[];

  @OneToMany(() => Sublote, (sublote) => sublote.cultivo)
  sublotes: Sublote[];

  @OneToMany(() => CultivoEpa, (ce) => ce.cultivo)
  cultivosEpa: CultivoEpa[];

  // --- 2. AÑADIR ESTA NUEVA RELACIÓN ---
  @OneToMany(() => Gasto, (gasto) => gasto.cultivo)
  gastos: Gasto[];
}