import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateLoteEstadoDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['Activo', 'Inactivo', 'En preparación'], { // <-- AÑADIR 'En preparación' AQUÍ
    message: 'El estado debe ser "Activo", "Inactivo" o "En preparación"',
  })
  estado: string;
}
