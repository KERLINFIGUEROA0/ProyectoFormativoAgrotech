import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsEmail, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateUsuarioDto } from './create-usuario.dto';

export class UpdatePerfilDto extends PartialType(CreateUsuarioDto) {
  @IsOptional()
  @IsString()
  tipoIdentificacion?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error('La identificación debe ser un número válido');
      }
      return num;
    }
    return value;
  })
  identificacion?: number;

  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsEmail()
  correo?: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}

