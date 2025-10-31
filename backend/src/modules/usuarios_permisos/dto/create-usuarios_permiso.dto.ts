import { IsBoolean, IsInt } from 'class-validator';

export class CreateUsuarioPermisoDto {
  @IsInt()
  usuarioId: number;

  @IsInt()
  permisoId: number;

  @IsBoolean()
  estado: boolean;
}

