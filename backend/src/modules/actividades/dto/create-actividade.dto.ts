 import { IsString, IsDateString, IsOptional, IsNumber, IsIn, IsArray, IsPositive, ValidateNested,Min } from 'class-validator';
// --- 1. IMPORTA plainToInstance ---
import { Transform, Type, plainToInstance } from 'class-transformer';

export class MaterialUsadoDto {
  @IsNumber()
  @IsPositive()
  materialId: number;

  @IsNumber()
  @IsPositive()
  cantidadUsada: number;

  @IsString()
  @IsOptional()
  unidadMedida?: string;
}

export class CreateActividadDto {
  @IsString()
  titulo: string;

  // ... (otros campos: fecha, descripcion, etc. quedan igual) ...
  @IsDateString()
  fecha: Date;

  @IsString()
  @IsOptional()
  descripcion?: string;


  // --- 2. REEMPLAZA EL CAMPO 'materiales' CON ESTE BLOQUE COMPLETO ---
  @Transform(({ value }) => {
    let parsed: any;
    if (typeof value === 'string') {
      try {
        // 1. Parsear el string JSON que viene del FormData
        parsed = JSON.parse(value);
      } catch (e) {
        // Si el JSON es inválido, se devuelve un array vacío
        return [];
      }
    } else {
      // Si no es un string (ej. ya es un array), lo usamos directamente
      parsed = value;
    }

    // 2. Asegurarse de que sea un array
    if (!Array.isArray(parsed)) {
      return [];
    }

    // 3. Convertir cada objeto plano (plain) del array en una instancia de MaterialUsadoDto
    // ESTE ES EL PASO CLAVE que soluciona el error de 'whitelist: true'
    return parsed.map(item => plainToInstance(MaterialUsadoDto, item));
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MaterialUsadoDto) // Mantenemos @Type por si 'value' no es un string
  materiales?: MaterialUsadoDto[];
  // --- FIN DE LA CORRECCIÓN ---


  @IsString()
  @IsOptional()
  img?: string;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  usuario?: number;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  cultivo: number;

  @IsIn(['pendiente', 'en proceso', 'enviado', 'aprobado', 'rechazado', 'completado'])
  @IsOptional()
  estado?: 'pendiente' | 'en proceso' | 'enviado' | 'aprobado' | 'rechazado' | 'completado';

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number) // Ayuda a transformar string (de FormData) a number
  horas?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number) // Ayuda a transformar string (de FormData) a number
  tarifaHora?: number;
  // --- FIN DE CAMPOS NUEVOS ---
}
