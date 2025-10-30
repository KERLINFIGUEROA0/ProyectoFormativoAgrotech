import {
  IsString,
  IsNumber,
  IsEmail,
  IsNotEmpty,
  MinLength,
  Length,
  IsIn,
} from 'class-validator';
import * as seed from '../../../database/seed.json';

export class CreateUsuarioDto {
  @IsString({ message: 'El tipo de identificación debe ser un texto.' })
  @IsNotEmpty({ message: 'El tipo de identificación es obligatorio.' })
  @IsIn(['CC', 'TI'], {
    message: 'El tipo de identificación debe ser "CC" o "TI".',
  })
  Tipo_Identificacion: string;

  @IsNumber({}, { message: 'La identificación debe ser un número.' })
  @IsNotEmpty({ message: 'La identificación es obligatoria.' })
  identificacion: number;

  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  nombre: string;

  @IsString({ message: 'Los apellidos deben ser un texto.' })
  @IsNotEmpty({ message: 'Los apellidos son obligatorios.' })
  apellidos: string;

  @IsString({ message: 'El teléfono debe ser un texto.' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio.' })
  @Length(10, 10, { message: 'El teléfono debe tener 10 dígitos.' })
  telefono: string;

  @IsEmail({}, { message: 'El formato del correo no es válido.' })
  @IsNotEmpty({ message: 'El correo es obligatorio.' })
  correo: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;

  @IsNumber({}, { message: 'El ID del rol debe ser un número.' })
  @IsNotEmpty({ message: 'El rol es obligatorio.' })
  tipoUsuario: number;
}
