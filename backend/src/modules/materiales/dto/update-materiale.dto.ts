import { PartialType } from '@nestjs/mapped-types';
import { CreateMaterialeDto } from './create-materiale.dto';

export class UpdateMaterialeDto extends PartialType(CreateMaterialeDto) {}
