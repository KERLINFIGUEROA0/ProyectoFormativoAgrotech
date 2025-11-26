import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsArray,
} from 'class-validator';

export class CreateBrokerDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  protocolo: string;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  puerto: number;

  @IsString()
  @IsOptional()
  usuario?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsInt()
  @IsNotEmpty()
  loteId: number;

  @IsString()
  @IsOptional()
  prefijoTopicos?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  topicosAdicionales?: string[];
}