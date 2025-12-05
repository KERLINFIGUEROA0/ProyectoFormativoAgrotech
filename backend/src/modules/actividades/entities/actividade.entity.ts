import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Cultivo } from '../../cultivos/entities/cultivo.entity';
import { Lote } from '../../lotes/entities/lote.entity';
import { Sublote } from '../../sublotes/entities/sublote.entity';
import { ActividadMaterial } from '../../actividades_materiales/entities/actividades_materiale.entity';
import { RespuestaActividad } from './respuesta_actividad.entity';
import { ActividadUsuario } from './actividad_usuario.entity';
import { dateColumnTransformer } from '../../../common/transformers/date-column.transformer';


@Entity('actividades')
export class Actividad {
  @PrimaryGeneratedColumn({ name: 'Id_Actividad' })
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ name: 'Titulo', length: 40, nullable: true })
  titulo: string;

  @Column({ name: 'Fecha', type: 'date', nullable: true, transformer: dateColumnTransformer })
  fecha: Date;

  @Column({ name: 'Descripcion', length: 250, nullable: true })
  descripcion: string;

   @Column({ name: 'Img', type: 'text', nullable: true })
   img: string;

   @Column({ name: 'archivo_inicial', type: 'text', nullable: true })
   archivoInicial?: string; // JSON string de filenames para el archivo inicial

@ManyToOne(() => Usuario, (u) => u.actividades, { nullable: true })
@JoinColumn({ name: 'Id_Identificacion', referencedColumnName: 'identificacion' })
usuario: Usuario | null;

 @ManyToOne(() => Cultivo, (cultivo) => cultivo.actividades, { onDelete: 'CASCADE' })
 @JoinColumn({ name: 'Id_Cultivo' })
  cultivo: Cultivo;

  @ManyToOne(() => Lote, (lote) => lote.id, { nullable: true })
  @JoinColumn({ name: 'Id_Lote' })
  lote?: Lote;

  @ManyToOne(() => Sublote, (sublote) => sublote.id, { nullable: true })
  @JoinColumn({ name: 'Id_Sublote' })
  sublote?: Sublote;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'Id_Responsable' })
  responsable?: Usuario;

  @OneToMany(() => ActividadMaterial, (am) => am.actividad)
  actividadMaterial: ActividadMaterial[];

  @OneToMany(() => RespuestaActividad, (respuesta) => respuesta.actividad)
  respuestas: RespuestaActividad[];

  // @OneToMany(() => ActividadUsuario, (asignacion) => asignacion.actividad)
  // asignaciones: ActividadUsuario[]; // Deshabilitado hasta ejecutar migración

  @Column({
    type: 'enum',
    enum: ['pendiente', 'en proceso', 'enviado', 'aprobado', 'rechazado', 'completado', 'finalizado'],
    default: 'pendiente',
  })
  estado: 'pendiente' | 'en proceso' | 'enviado' | 'aprobado' | 'rechazado' | 'completado' | 'finalizado';

  @Column({ name: 'respuesta_texto', type: 'text', nullable: true })
  respuestaTexto?: string;

  @Column({ name: 'respuesta_archivos', type: 'text', nullable: true })
  respuestaArchivos?: string; // JSON string de array de filenames

  @Column({ name: 'calificacion', type: 'varchar', length: 20, nullable: true })
  calificacion?: string; // e.g., 'aprobado', 'rechazado'

  @Column({ name: 'comentario_instructor', type: 'text', nullable: true })
  comentarioInstructor?: string;

  @Column({ name: 'asignados', type: 'text', nullable: true })
  asignados?: string; // JSON string con nombres de usuarios asignados

@Column({
    name: 'horas_trabajadas',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true
  })
  horas?: number;

  @Column({ 
    name: 'tarifa_hora', 
    type: 'decimal', 
    precision: 10, 
    scale: 2, 
    nullable: true 
  })
  tarifaHora?: number;
  // --- FIN DE CAMPOS NUEVOS ---
}




