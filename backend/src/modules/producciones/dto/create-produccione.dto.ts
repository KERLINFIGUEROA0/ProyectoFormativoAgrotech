// src/modules/producciones/dto/create-produccione.dto.ts
import { IsInt, IsNotEmpty, IsDateString, IsPositive, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateProduccioneDto {
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @IsPositive({ message: 'La cantidad debe ser un número positivo.' })
  @IsNotEmpty({ message: 'La cantidad es obligatoria.' })
  cantidad: number;

  @IsDateString({}, { message: 'La fecha debe tener un formato válido (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'La fecha es obligatoria.' })
  fecha: string;

  @IsInt({ message: 'El ID del cultivo debe ser un número entero.' })
  @IsNotEmpty({ message: 'El ID del cultivo es obligatorio.' })
  cultivoId: number;

  // --- ✅ AÑADIDO: Campo de estado opcional ---
  @IsString()
  @IsOptional()
  @IsIn(['Programado', 'En Proceso', 'Cosechado'])
  estado?: string;
}