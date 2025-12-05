import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Actividad } from './actividade.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('respuestas_actividad')
export class RespuestaActividad {
  @PrimaryGeneratedColumn({ name: 'Id_Respuesta' })
  id: number;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string;

  @Column({ name: 'archivos', type: 'text', nullable: true })
  archivos: string; // JSON string de filenames

  @Column({ name: 'fecha_envio', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaEnvio: Date;

  @Column({
    type: 'enum',
    enum: ['pendiente', 'aprobado', 'rechazado'],
    default: 'pendiente',
  })
  estado: 'pendiente' | 'aprobado' | 'rechazado';

  @Column({ name: 'comentario_instructor', type: 'text', nullable: true })
  comentarioInstructor?: string;

  @ManyToOne(() => Actividad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_actividad' })
  actividad: Actividad;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'id_usuario', referencedColumnName: 'identificacion' })
  usuario: Usuario;
}