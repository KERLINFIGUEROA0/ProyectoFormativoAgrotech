import { IsNumberString, IsString, MinLength, IsOptional, Length, Matches } from 'class-validator';
import * as seed from '../../database/seed.json';

export class LoginAuthDto {
  @IsNumberString({}, { message: 'La identificación debe ser un número' })
  identificacion: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener mínimo 8 caracteres' })
  password: string;

  @IsOptional()
  @IsString({ message: 'El id_ficha debe ser un texto.' })
  @Length(6, 8, { message: 'El id_ficha debe tener entre 6 y 8 caracteres.' })
  @Matches(/^\d+$/, { message: 'El id_ficha debe contener solo números.' })
  id_ficha?: string;
}

