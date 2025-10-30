import { PartialType } from '@nestjs/mapped-types';
import { CreateUsuarioPermisoDto } from './create-usuarios_permiso.dto';

export class UpdateUsuarioPermisoDto extends PartialType(CreateUsuarioPermisoDto) {}

