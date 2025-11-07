import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class CreateSubscripcionDto {
  @IsInt()
  @IsNotEmpty()
  brokerId: number; // ID del broker al que pertenece

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsInt()
  @Min(0)
  @Max(2)
  qos: number;
}