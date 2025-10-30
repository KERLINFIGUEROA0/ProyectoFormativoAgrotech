import { IsNumberString, IsString, MinLength } from 'class-validator';


export class LoginAuthDto {
  @IsNumberString({}, { message: 'La identificación debe ser un número' })
  identificacion: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener mínimo 8 caracteres' })
  password: string;
}

