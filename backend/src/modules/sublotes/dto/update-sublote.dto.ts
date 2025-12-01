import { PartialType } from '@nestjs/mapped-types';
import { CreateSubloteDto } from './create-sublote.dto';

export class UpdateSubloteDto extends PartialType(CreateSubloteDto) {}
