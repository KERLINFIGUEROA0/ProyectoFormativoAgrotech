import { IsString, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @IsString()
  actual: string;

  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  nueva: string;
}

