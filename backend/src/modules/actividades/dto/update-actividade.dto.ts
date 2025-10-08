import { PartialType } from '@nestjs/mapped-types';
import { CreateActividadDto } from './create-actividade.dto';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateActividadDto extends PartialType(CreateActividadDto) {
  @IsString()
  @IsIn(['pendiente', 'en proceso', 'completado'])
  @IsOptional()
  estado?: 'pendiente' | 'en proceso' | 'completado';
}
