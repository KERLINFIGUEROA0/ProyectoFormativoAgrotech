import { IsString, IsNotEmpty } from 'class-validator';

export class CreateDraculaDto {
  @IsString()
  @IsNotEmpty()
  placa: string;

  @IsString()
  @IsNotEmpty()
  color: string;
}