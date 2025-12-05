import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Actividad } from '../../actividades/entities/actividade.entity';
import { dateColumnTransformer } from '../../../common/transformers/date-column.transformer';

@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn({ name: 'Id_Pago' })
  id: number;

  @Column({ name: 'Id_Usuario', type: 'bigint' })
  idUsuario: number;

  @Column({ name: 'Id_Actividad' })
  idActividad: number;

  @Column({
    name: 'monto',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  monto: number;

  @Column({
    name: 'horas_trabajadas',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
  })
  horasTrabajadas: number;

  @Column({
    name: 'tarifa_hora',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  tarifaHora: number;

  @Column({ name: 'descripcion', length: 255, nullable: true })
  descripcion: string;

  @Column({ name: 'fecha_pago', type: 'date', nullable: false, transformer: dateColumnTransformer })
  fechaPago: Date;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  // Relaciones
  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'Id_Usuario', referencedColumnName: 'identificacion' })
  usuario: Usuario;

  @ManyToOne(() => Actividad, { nullable: false })
  @JoinColumn({ name: 'Id_Actividad' })
  actividad: Actividad;
}