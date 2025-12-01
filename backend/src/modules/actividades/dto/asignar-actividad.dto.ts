import { IsNumber, IsString, IsDateString, IsArray, ArrayNotEmpty, IsOptional, IsIn,ValidateNested } from 'class-validator';
import { MaterialUsadoDto } from './create-actividade.dto';
import { Type } from 'class-transformer';

export class AsignarActividadDto {
   @IsNumber()
   cultivo: number; // ID del cultivo

   @IsNumber()
   @IsOptional()
   lote?: number; // ID del lote (opcional)

   @IsNumber()
   @IsOptional()
   sublote?: number; // ID del sublote (opcional)

   @IsString()
   titulo: string; // Título o nombre de la actividad

   @IsString()
   descripcion: string; // Descripción de la actividad a realizar

   @IsDateString()
   fecha: string; // Fecha de la actividad

   @IsArray()
     @IsOptional()
     @ValidateNested({ each: true })
     @Type(() => MaterialUsadoDto)
     materiales?: MaterialUsadoDto[];

   @IsArray()
   @ArrayNotEmpty()
   @IsNumber({}, { each: true })
   aprendices: number[]; // Array de identificaciones de aprendices

   @IsNumber()
   @IsOptional()
   responsable?: number; // ID del usuario responsable de devolver materiales

   @IsString()
   @IsIn(['pendiente', 'en proceso', 'completado', 'finalizado'])
   @IsOptional()
   estado?: 'pendiente' | 'en proceso' | 'completado' | 'finalizado';

   @IsString()
   @IsOptional()
   archivoInicial?: string; // JSON string de filenames para el archivo inicial
}