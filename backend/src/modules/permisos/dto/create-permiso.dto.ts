import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePermisoDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del permiso es obligatorio' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(150, { message: 'La descripción no puede tener más de 150 caracteres' })
  descripcion?: string;
}

