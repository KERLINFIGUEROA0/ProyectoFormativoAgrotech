import { PartialType } from '@nestjs/mapped-types';
import { CreateSensoreDto } from './create-sensore.dto';

export class UpdateSensoreDto extends PartialType(CreateSensoreDto) {}
