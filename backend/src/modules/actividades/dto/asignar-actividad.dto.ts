import { IsNumber, IsString, IsDateString, IsArray, ArrayNotEmpty, IsOptional, IsIn } from 'class-validator';

export class AsignarActividadDto {
  @IsNumber()
  cultivo: number; // ID del cultivo

  @IsString()
  titulo: string; // Título o nombre de la actividad

  @IsString()
  descripcion: string; // Descripción de la actividad a realizar

  @IsDateString()
  fecha: string; // Fecha de la actividad

  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  aprendices: number[]; // Array de identificaciones de aprendices

  @IsString()
  @IsIn(['pendiente', 'en proceso', 'completado'])
  @IsOptional()
  estado?: 'pendiente' | 'en proceso' | 'completado';
}