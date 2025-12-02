import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, MaxLength, IsDateString, IsEnum } from 'class-validator';
// Importamos los enums del backend
import { TipoCategoria } from '../../../common/enums/tipo-categoria.enum';
import { TipoMaterial } from '../../../common/enums/tipo-material.enum';
import { MedidasDeContenido } from '../../../common/enums/unidad-contenido.enum';
import { TipoEmpaque } from '../../../common/enums/tipo-empaque.enum';
import { TipoConsumo } from '../../../common/enums/tipo-consumo.enum';
import { UnidadMedida } from '../../../common/enums/unidad-medida.enum';
import { is } from 'cheerio/dist/commonjs/api/traversing';

export class CreateMaterialeDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio.' })
  @MaxLength(50)
  nombre: string;

  @IsNumber()
  @IsNotEmpty({ message: 'La cantidad es obligatoria.' })
  @Min(0)
  cantidad: number;

  @IsEnum(TipoConsumo)
  @IsOptional()
  tipoConsumo?: TipoConsumo;

  @IsNumber()
  @IsOptional()
  @Min(1)
  cantidadPorUnidad?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  usosTotales?: number;

  // --- VALIDACIÓN PARA LAS NUEVAS COLUMNAS ---
  
  @IsEnum(TipoCategoria)
  @IsNotEmpty({ message: 'La categoría principal es obligatoria.' })
  tipoCategoria: TipoCategoria;

  @IsEnum(TipoMaterial)
  @IsOptional() // Opcional, ya que no todas las categorías tienen sub-materiales
  tipoMaterial?: TipoMaterial;
  
  @IsEnum(MedidasDeContenido)
  @IsOptional()
  medidasDeContenido?: MedidasDeContenido;

  @IsEnum(TipoEmpaque)
  @IsNotEmpty({ message: 'El tipo de empaque es obligatorio.' })
  tipoEmpaque: TipoEmpaque;
  
  // --- CAMPOS OPCIONALES EXISTENTES ---
  
  @IsNumber()
  @IsOptional()
  @Min(0)
  precio?: number;

 @IsNumber()
  @IsOptional()
  @Min(0)
  pesoPorUnidad?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  descripcion?: string;

  @IsString()
  @IsOptional()
  ubicacion?: string;

  @IsString()
  @IsOptional()
  proveedor?: string;

  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string;

  // Campos para ingreso con paquetes
  @IsNumber()
  @IsOptional()
  @Min(1)
  cantidadPaquetes?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.001)
  tamañoPorPaquete?: number;

  @IsEnum(UnidadMedida)
  @IsOptional()
  unidadMedidaIngreso?: UnidadMedida;
}