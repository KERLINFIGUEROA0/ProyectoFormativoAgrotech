import { PartialType } from '@nestjs/mapped-types';
import { CreateDraculaDto } from './create-dracula.dto';

export class UpdateDraculaDto extends PartialType(CreateDraculaDto) {}