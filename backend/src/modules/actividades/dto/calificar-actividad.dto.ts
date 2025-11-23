import { IsIn, IsOptional, IsString } from 'class-validator';

export class CalificarActividadDto {
  @IsIn(['aprobado', 'rechazado'])
  calificacion: 'aprobado' | 'rechazado';

  @IsOptional()
  @IsString()
  comentarioInstructor?: string;
}