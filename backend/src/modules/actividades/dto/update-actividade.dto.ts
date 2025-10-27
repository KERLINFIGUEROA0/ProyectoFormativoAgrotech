import { PartialType } from '@nestjs/mapped-types';
import { CreateActividadDto } from './create-actividade.dto';
import { IsString, IsOptional, IsIn, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateActividadDto extends PartialType(CreateActividadDto) {
  @IsString()
  @IsIn(['pendiente', 'en proceso', 'completado'])
  @IsOptional()
  estado?: 'pendiente' | 'en proceso' | 'completado';

  @Transform(({ value }) => value ? parseInt(value) : undefined)
  @IsNumber()
  @IsOptional()
  usuario?: number;

  @Transform(({ value }) => value ? parseInt(value) : undefined)
  @IsNumber()
  @IsOptional()
  cultivo?: number;
}
