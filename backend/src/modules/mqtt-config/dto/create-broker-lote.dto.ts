import { IsNotEmpty, IsArray, IsNumber } from 'class-validator';

export class CreateBrokerLoteDto {
  @IsNotEmpty()
  @IsNumber()
  brokerId: number;

  @IsNotEmpty()
  @IsNumber()
  loteId: number;

  @IsArray()
  @IsNotEmpty()
  topicos: string[];
}