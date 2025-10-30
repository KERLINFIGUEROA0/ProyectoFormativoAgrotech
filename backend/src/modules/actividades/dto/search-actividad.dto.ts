import { IsString, IsOptional, IsNotEmpty, IsNumber, IsIn } from 'class-validator';

export class SearchActividadDto {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString({ message: 'El título de búsqueda debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El título no puede estar vacío.' })
  @IsOptional() // Hacemos que sea opcional para que la ruta pueda listar todo si no se proporciona
  titulo?: string;

  @IsString()
  @IsOptional()
  q?: string; // campo de búsqueda global

  @IsString()
  @IsIn(['pendiente', 'en proceso', 'completado'])
  @IsOptional()
  estado?: 'pendiente' | 'en proceso' | 'completado';

  // Puedes añadir otros filtros aquí si los necesitas:
  // @IsNumber()
  // @IsOptional()
  // cultivoId?: number;
}