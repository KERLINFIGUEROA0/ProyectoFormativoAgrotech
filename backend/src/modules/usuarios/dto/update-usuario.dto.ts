import { IsString, IsNumber, IsEmail, IsOptional, MinLength, Length, IsIn, Matches } from 'class-validator';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString({ message: 'El tipo de identificación debe ser un texto.' })
  @IsIn(['CC', 'TI'], { message: 'El tipo de identificación debe ser "CC" o "TI".' })
  Tipo_Identificacion?: string;

  @IsOptional()
  @IsNumber({}, { message: 'La identificación debe ser un número.' })
  identificacion?: number;

  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto.' })
  nombre?: string;

  @IsOptional()
  @IsString({ message: 'Los apellidos deben ser un texto.' })
  apellidos?: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto.' })
  @Length(10, 10, { message: 'El teléfono debe tener 10 dígitos.' })
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El formato del correo no es válido.' })
  correo?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El ID del rol debe ser un número.' })
  tipoUsuario?: number;

  @IsOptional()
  @IsString({ message: 'El id_ficha debe ser un texto.' })
  @Length(6, 8, { message: 'El id_ficha debe tener entre 6 y 8 caracteres.' })
  @Matches(/^\d+$/, { message: 'El id_ficha debe contener solo números.' })
  id_ficha?: string;
}
