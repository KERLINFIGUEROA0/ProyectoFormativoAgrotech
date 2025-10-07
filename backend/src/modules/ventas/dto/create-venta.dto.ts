import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsInt, IsEnum } from 'class-validator';
import { TipoMovimiento } from '../../../common/enums/tipo-movimiento.enum';

export class CreateVentaDto {
  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @IsNotEmpty({ message: "El monto (precio unitario) es obligatorio." })
  monto: number;

  @IsDateString()
  @IsNotEmpty({ message: "La fecha es obligatoria." })
  fecha: string;

  @IsInt()
  @IsNotEmpty({ message: "La cantidad es obligatoria." })
  cantidad: number;

  @IsInt()
  @IsNotEmpty({ message: "El ID de producción es obligatorio." })
  produccionId: number;

  @IsEnum(TipoMovimiento)
  @IsOptional()
  tipo?: TipoMovimiento;
}