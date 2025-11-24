import { IsOptional, IsString } from 'class-validator';

export class SubmitRespuestaDto {
  @IsOptional()
  @IsString()
  respuestaTexto?: string;

  @IsOptional()
  @IsString()
  respuestaArchivos?: string; // JSON string
}