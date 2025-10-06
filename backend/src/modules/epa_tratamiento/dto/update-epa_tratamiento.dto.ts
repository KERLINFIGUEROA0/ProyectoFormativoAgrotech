import { PartialType } from '@nestjs/mapped-types';
import { CreateEpaTratamientoDto } from './create-epa_tratamiento.dto';

export class UpdateEpaTratamientoDto extends PartialType(CreateEpaTratamientoDto) {}

