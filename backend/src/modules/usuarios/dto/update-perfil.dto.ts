import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsEmail } from 'class-validator';
import { CreateUsuarioDto } from './create-usuario.dto';

export class UpdatePerfilDto extends PartialType(CreateUsuarioDto) {
  @IsOptional()
  @IsString()
  tipoIdentificacion?: string;

  @IsOptional()
  @IsString()
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

