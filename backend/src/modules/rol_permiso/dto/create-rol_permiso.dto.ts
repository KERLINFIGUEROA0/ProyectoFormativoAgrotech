import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateRolPermisoDto {
  @IsNotEmpty()
  @IsNumber()
  tipoUsuarioId: number;

  @IsNotEmpty()
  @IsNumber()
  permisoId: number;
}

