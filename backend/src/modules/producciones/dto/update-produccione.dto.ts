import { PartialType } from '@nestjs/mapped-types';
import { CreateProduccioneDto } from './create-produccione.dto';

export class UpdateProduccioneDto extends PartialType(CreateProduccioneDto) {}
