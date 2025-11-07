import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateSensoreEstadoDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['Activo', 'Inactivo', 'Mantenimiento'])
  estado: 'Activo' | 'Inactivo' | 'Mantenimiento';
}

