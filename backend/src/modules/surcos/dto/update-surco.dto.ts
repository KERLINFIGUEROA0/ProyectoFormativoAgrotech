import { PartialType } from '@nestjs/mapped-types';
import { CreateSurcoDto } from './create-surco.dto';

export class UpdateSurcoDto extends PartialType(CreateSurcoDto) {}
