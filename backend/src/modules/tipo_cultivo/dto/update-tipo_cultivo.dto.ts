import { PartialType } from '@nestjs/mapped-types';
import { CreateTipoCultivoDto } from './create-tipo_cultivo.dto';

export class UpdateTipoCultivoDto extends PartialType(CreateTipoCultivoDto) {}
