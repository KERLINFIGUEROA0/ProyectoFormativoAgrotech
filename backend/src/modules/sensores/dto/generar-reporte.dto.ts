import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum FormatoReporte {
  PDF = 'pdf',
  EXCEL = 'excel',
}

export class GenerarReporteTrazabilidadDto {
  @IsEnum(FormatoReporte)
  formato: FormatoReporte;

  @IsNumber()
  loteId: number;

  @IsOptional()
  @IsNumber()
  subloteId?: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;
}