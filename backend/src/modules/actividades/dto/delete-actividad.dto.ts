import { IsNumber } from 'class-validator';

export class DeleteActividadDto {
  @IsNumber()
  id: number;
}