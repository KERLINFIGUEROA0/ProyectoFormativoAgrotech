import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class CreateFichaDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 8)
  @Matches(/^\d+$/, { message: 'id_ficha debe contener solo números' })
  id_ficha: string;
}
