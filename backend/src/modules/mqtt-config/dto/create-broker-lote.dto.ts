import { IsNotEmpty, IsArray, IsNumber, IsOptional, IsString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class TopicoConfigDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;
}

export class CreateBrokerLoteDto {
  @IsNotEmpty()
  @IsNumber()
  brokerId: number;

  @IsNotEmpty()
  @IsNumber()
  loteId: number;

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TopicoConfigDto)
  topicos: (string | TopicoConfigDto)[];

  @IsOptional()
  @IsNumber()
  puerto?: number;

  @IsOptional()
  @IsString()
  topicPrueba?: string;
}