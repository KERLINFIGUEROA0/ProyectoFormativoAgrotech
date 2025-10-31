import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateTipoUsuarioDto {
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre del rol es obligatorio.' })
  @MaxLength(20, { message: 'El nombre no puede exceder los 20 caracteres.' })
  nombre: string;

  @IsString({ message: 'La descripción debe ser un texto.' })
  @IsOptional()
  @MaxLength(150, { message: 'La descripción no puede exceder los 150 caracteres.' })
  descripcion?: string;
}
