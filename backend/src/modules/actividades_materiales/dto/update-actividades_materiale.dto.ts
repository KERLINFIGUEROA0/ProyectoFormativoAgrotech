import { PartialType } from '@nestjs/mapped-types';
import { CreateActividadesMaterialeDto } from './create-actividades_materiale.dto';

export class UpdateActividadesMaterialeDto extends PartialType(CreateActividadesMaterialeDto) {}

