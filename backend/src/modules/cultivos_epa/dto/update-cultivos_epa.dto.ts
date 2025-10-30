import { PartialType } from '@nestjs/mapped-types';
import { CreateCultivosEpaDto } from './create-cultivos_epa.dto';

export class UpdateCultivosEpaDto extends PartialType(CreateCultivosEpaDto) {}

