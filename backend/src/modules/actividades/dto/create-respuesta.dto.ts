import { IsOptional, IsString, IsIn } from 'class-validator';

export class CreateRespuestaDto {
  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  archivos?: string; // JSON string
}

export class UpdateRespuestaDto {
  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  archivos?: string; // JSON string
}

export class CalificarRespuestaDto {
  @IsIn(['aprobado', 'rechazado'])
  estado: 'aprobado' | 'rechazado';

  @IsOptional()
  @IsString()
  comentarioInstructor?: string;
}