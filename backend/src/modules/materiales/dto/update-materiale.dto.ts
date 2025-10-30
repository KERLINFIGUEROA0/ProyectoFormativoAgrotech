import { IsString, IsOptional, IsNumber, Min, MaxLength, IsDateString, IsEnum } from 'class-validator';
import { TipoCategoria } from '../../../common/enums/tipo-categoria.enum';
import { TipoMaterial } from '../../../common/enums/tipo-material.enum';
import { MedidasDeContenido } from '../../../common/enums/unidad-contenido.enum';
import { TipoEmpaque } from '../../../common/enums/tipo-empaque.enum';
import { PartialType } from '@nestjs/mapped-types';
import { CreateMaterialeDto } from './create-materiale.dto';

export class UpdateMaterialeDto extends PartialType(CreateMaterialeDto) {  
  @IsString()
  @IsOptional()
  @MaxLength(50)
  nombre?: string;

  @IsEnum(TipoMaterial, { message: 'El tipo de material no es válido.' })
  @IsOptional()
  tipoMaterial?: TipoMaterial;

  // ✅ CORRECCIÓN 1: 'tipoMedida' se cambia a 'tipoEmpaque'
  @IsEnum(TipoEmpaque, { message: 'el tipo de empaque no es válida.' })
  @IsOptional()
  tipoEmpaque?: TipoEmpaque;

  // ✅ CORRECCIÓN 2: 'MedidaDeContenido' se cambia a 'medidasDeContenido' (minúscula)
  @IsEnum(MedidasDeContenido, { message: 'La unidad de contenido no es válida.' })
  @IsOptional()
  medidasDeContenido?: MedidasDeContenido;
 
  @IsEnum(TipoCategoria, { message: 'La categoría principal no es válida.' })
  @IsOptional()
  tipoCategoria?: TipoCategoria;
  

  // ... (el resto de las propiedades no cambian)
  @IsNumber()
  @IsOptional()
  @Min(0)
  cantidad?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  pesoPorUnidad?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  precio?: number;

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
}