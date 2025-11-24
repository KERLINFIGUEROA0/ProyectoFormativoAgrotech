# DTOs y Validaciones del Backend

Este documento describe los Data Transfer Objects (DTOs) utilizados en el backend de NestJS para validar entradas en cada módulo. Los DTOs usan `class-validator` para asegurar la integridad de los datos. Cada tabla incluye campos, tipos, validaciones y mensajes de error.

## Módulo: Usuarios

Maneja autenticación y gestión de usuarios.

### CreateUsuarioDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| Tipo_Identificacion | string | @IsString, @IsNotEmpty, @IsIn(['CC', 'TI']) | El tipo de identificación debe ser "CC" o "TI". |
| identificacion | number | @IsNumber, @IsNotEmpty | La identificación es obligatoria. |
| nombre | string | @IsString, @IsNotEmpty | El nombre es obligatorio. |
| apellidos | string | @IsString, @IsNotEmpty | Los apellidos son obligatorios. |
| telefono | string | @IsString, @IsNotEmpty, @Length(10,10) | El teléfono debe tener 10 dígitos. |
| correo | string | @IsEmail, @IsNotEmpty | El formato del correo no es válido. |
| password | string | @IsString, @IsNotEmpty, @MinLength(8) | La contraseña debe tener al menos 8 caracteres. |
| tipoUsuario | number | @IsNumber, @IsNotEmpty | El rol es obligatorio. |
| id_ficha | string | @IsString, @IsOptional, @Length(6,8), @Matches(/^\d+$/) | El id_ficha debe tener entre 6 y 8 caracteres y contener solo números. |

### UpdateUsuarioDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| Tipo_Identificacion | string | @IsOptional, @IsString, @IsIn(['CC', 'TI']) | El tipo de identificación debe ser "CC" o "TI". |
| identificacion | number | @IsOptional, @IsNumber | - |
| nombre | string | @IsOptional, @IsString | El nombre debe ser un texto. |
| apellidos | string | @IsOptional, @IsString | Los apellidos deben ser un texto. |
| telefono | string | @IsOptional, @IsString, @Length(10,10) | El teléfono debe tener 10 dígitos. |
| correo | string | @IsOptional, @IsEmail | El formato del correo no es válido. |
| password | string | @IsOptional, @IsString, @MinLength(8) | La contraseña debe tener al menos 8 caracteres. |
| tipoUsuario | number | @IsOptional, @IsNumber | El ID del rol debe ser un número. |
| id_ficha | string | @IsOptional, @IsString, @Length(6,8), @Matches(/^\d+$/) | El id_ficha debe tener entre 6 y 8 caracteres y contener solo números. |

## Módulo: Cultivos

Gestiona cultivos agrícolas.

### CreateCultivoDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| nombre | string | @IsString, @IsNotEmpty | - |
| cantidad | number | @IsInt | - |
| img | string | @IsString, @IsOptional | - |
| descripcion | string | @IsString, @IsOptional | - |
| tipoCultivoId | number | @IsInt, @IsNotEmpty | - |
| Estado | string | @IsString, @IsOptional | - |
| Fecha_Plantado | string | @IsDateString, @IsOptional | - |

### UpdateCultivoDto
Similar a Create, con campos opcionales.

## Módulo: Lotes

Administra lotes de terreno.

### CreateLoteDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| nombre | string | @IsString, @IsNotEmpty | El nombre del lote es requerido. |
| area | number | @IsNumber, @IsNotEmpty, @Max(3000) | El área es requerida. El área del lote no puede superar los 3000 m². |
| estado | string | @IsString, @IsOptional, @IsIn(['Activo', 'Inactivo', 'En preparación']) | - |
| coordenadas | CoordenadasDto | @IsObject, @ValidateNested, @Type(() => CoordenadasDto), @IsOptional | - |

### UpdateLoteDto
Similar a Create.

## Módulo: Materiales

Controla inventario de materiales.

### CreateMaterialeDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| nombre | string | @IsString, @IsNotEmpty, @MaxLength(50) | El nombre del producto es obligatorio. |
| cantidad | number | @IsNumber, @IsNotEmpty, @Min(0) | La cantidad es obligatoria. |
| tipoCategoria | TipoCategoria | @IsEnum(TipoCategoria), @IsNotEmpty | La categoría principal es obligatoria. |
| tipoMaterial | TipoMaterial | @IsEnum(TipoMaterial), @IsOptional | - |
| medidasDeContenido | MedidasDeContenido | @IsEnum(MedidasDeContenido), @IsOptional | - |
| tipoEmpaque | TipoEmpaque | @IsEnum(TipoEmpaque), @IsNotEmpty | El tipo de empaque es obligatorio. |
| precio | number | @IsNumber, @IsOptional, @Min(0) | - |
| pesoPorUnidad | number | @IsNumber, @IsOptional, @Min(0) | - |
| descripcion | string | @IsString, @IsOptional, @MaxLength(255) | - |
| ubicacion | string | @IsString, @IsOptional | - |
| proveedor | string | @IsString, @IsOptional | - |
| fechaVencimiento | string | @IsDateString, @IsOptional | - |

### UpdateMaterialeDto
Similar a Create, con campos opcionales.

## Módulo: Ventas

Registra ventas de producciones.

### CreateVentaDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| descripcion | string | @IsString, @IsOptional | - |
| monto | number | @IsNumber, @IsNotEmpty | El monto (precio unitario) es obligatorio. |
| fecha | string | @IsDateString, @IsNotEmpty | La fecha es obligatoria. |
| cantidad | number | @IsInt, @IsNotEmpty | La cantidad es obligatoria. |
| produccionId | number | @IsInt, @IsNotEmpty | El ID de producción es obligatorio. |
| tipo | TipoMovimiento | @IsEnum(TipoMovimiento), @IsOptional | - |

### UpdateVentaDto
Similar a Create.

## Módulo: Producciones

Gestiona producciones agrícolas.

### CreateProduccioneDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| cantidad | number | @IsInt, @IsPositive, @IsNotEmpty | La cantidad debe ser un número entero positivo. La cantidad es obligatoria. |
| fecha | string | @IsDateString, @IsNotEmpty | La fecha debe tener un formato válido (YYYY-MM-DD). La fecha es obligatoria. |
| cultivoId | number | @IsInt, @IsNotEmpty | El ID del cultivo debe ser un número entero. El ID del cultivo es obligatorio. |
| estado | string | @IsString, @IsOptional, @IsIn(['Programado', 'En Proceso', 'Cosechado']) | - |

### UpdateProduccioneDto
Similar a Create.

## Notas Generales
- **@IsOptional**: Campos opcionales que no requieren validación si no se envían.
- **Enums**: Referencian tipos definidos en `common/enums`.
- **Transformaciones**: Algunos campos usan `@Transform` para conversión (ej. string a number).
- Actualizar estas tablas al modificar DTOs para mantener la documentación sincronizada.