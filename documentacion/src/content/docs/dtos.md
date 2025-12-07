---
title: "DTOs"
---

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
| area | number | @IsNumber, @IsNotEmpty, @Max(10000) | El área es requerida. El área del lote no puede superar los 10000 m². |
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

## Módulo: Actividades Materiales

Gestiona la relación entre actividades y materiales utilizados.

### CreateActividadesMaterialeDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| materialId | number | @IsNumber, @IsNotEmpty | - |
| actividadId | number | @IsNumber, @IsNotEmpty | - |
| cantidadUsada | number | @IsNumber, @IsOptional | - |
| unidadMedida | UnidadMedida | @IsEnum(UnidadMedida), @IsOptional | - |

**Ejemplo:**
```json
{
  "materialId": 1,
  "actividadId": 2,
  "cantidadUsada": 10,
  "unidadMedida": "kg"
}
```

### UpdateActividadesMaterialeDto
Similar a Create, con campos opcionales.

## Módulo: Cultivos EPA

Asocia cultivos con problemas de enfermedades, plagas y adversidades (EPA).

### CreateCultivosEpaDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| cultivo | number | @IsNumber, @IsNotEmpty | - |
| epa | number | @IsNumber, @IsNotEmpty | - |

**Ejemplo:**
```json
{
  "cultivo": 1,
  "epa": 2
}
```

### UpdateCultivosEpaDto
Similar a Create, con campos opcionales.

## Módulo: EPA

Gestiona enfermedades, plagas y adversidades (EPA) en cultivos.

### CreateEpaDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| fechaEncuentro | Date | @IsDateString, @IsNotEmpty | - |
| nombre | string | @IsString, @IsNotEmpty | - |
| descripcion | string | @IsString, @IsOptional | - |
| tipoEnfermedad | string | @IsString, @IsNotEmpty | - |
| deficiencias | string | @IsString, @IsOptional | - |
| img | string | @IsString, @IsOptional | - |
| complicaciones | string | @IsString, @IsOptional | - |

**Ejemplo:**
```json
{
  "fechaEncuentro": "2023-10-01",
  "nombre": "Mildiu",
  "descripcion": "Enfermedad fúngica",
  "tipoEnfermedad": "Fúngica",
  "deficiencias": "Falta de nutrientes",
  "img": "url_imagen",
  "complicaciones": "Pérdida de cosecha"
}
```

### UpdateEpaDto
Similar a Create, con campos opcionales.

## Módulo: EPA Tratamiento

Asocia tratamientos con problemas EPA.

### CreateEpaTratamientoDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| tratamiento | number | @IsNumber, @IsNotEmpty | - |
| epa | number | @IsNumber, @IsNotEmpty | - |

**Ejemplo:**
```json
{
  "tratamiento": 1,
  "epa": 2
}
```

### UpdateEpaTratamientoDto
Similar a Create, con campos opcionales.

## Módulo: Fichas

Gestiona fichas de aprendices.

### CreateFichaDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| nombre | string | @IsString, @IsNotEmpty, @Length(1,100) | - |
| id_ficha | string | @IsString, @IsNotEmpty, @Length(6,8), @Matches(/^\d+$/) | id_ficha debe contener solo números |

**Ejemplo:**
```json
{
  "nombre": "Ficha Desarrollo",
  "id_ficha": "12345678"
}
```

### UpdateFichaDto
Similar a Create, con campos opcionales.

## Módulo: Gastos Producción

Registra gastos asociados a la producción agrícola.

### CreateGastosProduccionDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| descripcion | string | @IsString, @IsNotEmpty | - |
| monto | number | @IsNumber, @IsNotEmpty | - |
| fecha | string | @IsDateString, @IsNotEmpty | - |
| produccion | number | @IsNumber, @IsOptional | - |
| cultivo | number | @IsNumber, @IsOptional | - |
| cantidad | number | @IsNumber, @IsOptional | - |
| unidad | string | @IsString, @IsOptional | - |
| precioUnitario | number | @IsNumber, @IsOptional | - |

**Ejemplo:**
```json
{
  "descripcion": "Compra de fertilizantes",
  "monto": 50000,
  "fecha": "2023-10-01",
  "produccion": 1,
  "cultivo": 2,
  "cantidad": 100,
  "unidad": "kg",
  "precioUnitario": 500
}
```

### UpdateGastosProduccionDto
Similar a Create, con campos opcionales.

## Módulo: Información Sensor

Almacena datos de sensores IoT.

### CreateInformacionSensorDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| valor | number | @IsNumber, @IsNotEmpty | - |
| sensorId | number | @IsNumber, @IsNotEmpty | - |

**Ejemplo:**
```json
{
  "valor": 25.5,
  "sensorId": 1
}
```

### UpdateInformacionSensorDto
Similar a Create, con campos opcionales.

## Módulo: Módulos

Gestiona módulos del sistema.

### CreateModuloDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| nombre | string | - | - |
| descripcion | string | - | - |

**Ejemplo:**
```json
{
  "nombre": "Usuarios",
  "descripcion": "Módulo de gestión de usuarios"
}
```

### UpdateModuloDto
Similar a Create, con campos opcionales.

## Módulo: MQTT Config

Configura brokers MQTT y suscripciones para comunicación IoT.

### CreateBrokerDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| nombre | string | @IsString, @IsNotEmpty | - |
| protocolo | string | @IsString, @IsNotEmpty | - |
| host | string | @IsString, @IsNotEmpty | - |
| puerto | number | @IsInt, @Min(1), @Max(65535) | - |
| usuario | string | @IsString, @IsOptional | - |
| password | string | @IsString, @IsOptional | - |
| loteId | number | @IsInt, @IsNotEmpty | - |
| prefijoTopicos | string | @IsString, @IsOptional | - |
| topicosAdicionales | (string \| TopicoConfigDto)[] | @IsArray, @IsOptional, @IsValidTopico | Cada tópico debe ser un string o un objeto con topic (string requerido) y min/max (números opcionales >= 0) |

**Ejemplo:**
```json
{
  "nombre": "Broker Principal",
  "protocolo": "mqtt",
  "host": "broker.example.com",
  "puerto": 1883,
  "usuario": "user",
  "password": "pass",
  "loteId": 1,
  "prefijoTopicos": "agrotech/",
  "topicosAdicionales": ["sensor/temp", {"topic": "sensor/hum", "min": 0, "max": 100}]
}
```

### CreateBrokerLoteDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| brokerId | number | @IsNotEmpty, @IsNumber | - |
| loteId | number | @IsNotEmpty, @IsNumber | - |
| topicos | (string \| TopicoConfigDto)[] | @IsArray, @IsNotEmpty, @ValidateNested | - |
| puerto | number | @IsOptional, @IsNumber | - |
| topicPrueba | string | @IsOptional, @IsString | - |

**Ejemplo:**
```json
{
  "brokerId": 1,
  "loteId": 2,
  "topicos": ["temp", "hum"],
  "puerto": 1883,
  "topicPrueba": "test/topic"
}
```

### CreateSubscripcionDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| brokerId | number | @IsInt, @IsNotEmpty | - |
| topic | string | @IsString, @IsNotEmpty | - |
| qos | number | @IsInt, @Min(0), @Max(2) | - |

**Ejemplo:**
```json
{
  "brokerId": 1,
  "topic": "sensor/temp",
  "qos": 1
}
```

### UpdateMqttConfigDto
Similar a CreateBrokerDto, con campos opcionales.

## Módulo: Pagos

Registra pagos por actividades realizadas.

### CreatePagoDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| idUsuario | number | @IsNumber, @IsNotEmpty | - |
| idActividad | number | @IsNumber, @IsNotEmpty | - |
| monto | number | @IsNumber, @Min(0) | - |
| horasTrabajadas | number | @IsNumber, @Min(0) | - |
| tarifaHora | number | @IsNumber, @Min(0) | - |
| descripcion | string | @IsString, @IsOptional | - |
| fechaPago | string | @IsDateString | - |

**Ejemplo:**
```json
{
  "idUsuario": 1,
  "idActividad": 2,
  "monto": 50000,
  "horasTrabajadas": 10,
  "tarifaHora": 5000,
  "descripcion": "Pago por siembra",
  "fechaPago": "2023-10-01"
}
```

### UpdatePagoDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| monto | number | @IsNumber, @IsOptional, @Min(0) | - |
| horasTrabajadas | number | @IsNumber, @IsOptional, @Min(0) | - |
| tarifaHora | number | @IsNumber, @IsOptional, @Min(0) | - |
| descripcion | string | @IsString, @IsOptional | - |
| fechaPago | string | @IsOptional | - |

**Ejemplo:**
```json
{
  "monto": 60000,
  "descripcion": "Actualización de pago"
}
```

## Módulo: Rol Permiso

Asocia roles con permisos.

### CreateRolPermisoDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| tipoUsuarioId | number | @IsNotEmpty, @IsNumber | - |
| permisoId | number | @IsNotEmpty, @IsNumber | - |

**Ejemplo:**
```json
{
  "tipoUsuarioId": 1,
  "permisoId": 2
}
```

### UpdateRolPermisoDto
Similar a Create, con campos opcionales.

## Módulo: Tipo Cultivo

Gestiona tipos de cultivos.

### CreateTipoCultivoDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| nombre | string | @IsString, @IsNotEmpty, @MaxLength(20) | - |
| descripcion | string | @IsString, @IsOptional, @MaxLength(150) | - |

**Ejemplo:**
```json
{
  "nombre": "Tomate",
  "descripcion": "Cultivo de tomate cherry"
}
```

### UpdateTipoCultivoDto
Similar a Create, con campos opcionales.

## Módulo: Tipo Sensor

Gestiona tipos de sensores IoT.

### CreateTipoSensorDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| nombre | string | @IsString, @IsNotEmpty, @MaxLength(100) | El nombre del tipo de sensor es obligatorio. |

**Ejemplo:**
```json
{
  "nombre": "Temperatura"
}
```

### UpdateTipoSensorDto
Similar a Create, con campos opcionales.

## Módulo: Tipo Usuario

Gestiona tipos de usuarios (roles).

### CreateTipoUsuarioDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|-----------------|
| nombre | string | @IsString, @IsNotEmpty, @MaxLength(20) | El nombre del rol es obligatorio. |
| descripcion | string | @IsString, @IsOptional, @MaxLength(150) | La descripción no puede exceder los 150 caracteres. |

**Ejemplo:**
```json
{
  "nombre": "Administrador",
  "descripcion": "Usuario con permisos completos"
}
```

### UpdateTipoUsuarioDto
Similar a Create, con campos opcionales.
## Notas Generales
- **@IsOptional**: Campos opcionales que no requieren validación si no se envían.
- **Enums**: Referencian tipos definidos en `common/enums`.
- **Transformaciones**: Algunos campos usan `@Transform` para conversión (ej. string a number).
- Actualizar estas tablas al modificar DTOs para mantener la documentación sincronizada.