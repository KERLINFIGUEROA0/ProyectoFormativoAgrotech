import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum FormatoReporte {
  PDF = 'pdf',
  CSV = 'csv',
}

export class GenerarReporteTrazabilidadDto {
  @IsEnum(FormatoReporte)
  formato: FormatoReporte;

  @IsNumber()
  loteId: number;

  @IsOptional()
  @IsNumber()
  subloteId?: number;

  @IsOptional()
  @IsNumber()
  cultivoId?: number; // Nuevo campo opcional para cultivo específico

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;
}