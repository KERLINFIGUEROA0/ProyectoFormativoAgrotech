import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateSurcoEstadoDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['Disponible', 'En siembra', 'En cosecha', 'Mantenimiento'], {
    message: 'El estado proporcionado no es válido.',
  })
  estado: string;
}
