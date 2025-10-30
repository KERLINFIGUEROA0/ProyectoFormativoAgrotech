import { PartialType } from '@nestjs/mapped-types';
import { CreateGastosProduccionDto } from './create-gastos_produccion.dto';

export class UpdateGastosProduccionDto extends PartialType(CreateGastosProduccionDto) {}

