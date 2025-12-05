import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateSubloteEstadoDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['Disponible', 'En producción', 'Descanso'], {
    message: 'El estado proporcionado no es válido.',
  })
  estado: string;
}
