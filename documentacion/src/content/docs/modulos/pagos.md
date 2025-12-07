---
title: "Módulo Pagos"
---

# Módulo Pagos

## Endpoints

### POST /pagos
**Descripción**: Crea un nuevo pago o múltiples pagos para pasantes por actividades realizadas.

**URL completa:** `http://localhost:3000/pagos`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body (Pago único):**
```json
{
  "idUsuario": 123456789,
  "idActividad": 1,
  "monto": 50000,
  "horasTrabajadas": 4,
  "tarifaHora": 12500,
  "descripcion": "Pago por siembra de tomates",
  "fechaPago": "2024-01-15"
}
```

**Request Body (Múltiples pagos):**
```json
[
  {
    "idUsuario": 123456789,
    "idActividad": 1,
    "monto": 50000,
    "horasTrabajadas": 4,
    "tarifaHora": 12500,
    "descripcion": "Pago por siembra de tomates",
    "fechaPago": "2024-01-15"
  },
  {
    "idUsuario": 987654321,
    "idActividad": 1,
    "monto": 60000,
    "horasTrabajadas": 5,
    "tarifaHora": 12000,
    "descripcion": "Pago por preparación de suelo",
    "fechaPago": "2024-01-15"
  }
]
```

**Response:**
```json
{
  "id": 1,
  "idUsuario": 123456789,
  "idActividad": 1,
  "monto": 50000,
  "horasTrabajadas": 4,
  "tarifaHora": 12500,
  "descripcion": "Pago por siembra de tomates",
  "fechaPago": "2024-01-15T00:00:00.000Z",
  "fechaCreacion": "2024-01-15T10:00:00.000Z",
  "usuario": {
    "identificacion": 123456789,
    "nombre": "Juan Pérez",
    "apellidos": "García",
    "tipoUsuario": {
      "id": 1,
      "nombre": "Pasante"
    }
  },
  "actividad": {
    "id": 1,
    "titulo": "Siembra de tomates",
    "cultivo": {
      "id": 1,
      "nombre": "Tomates cherry"
    }
  }
}
```

### GET /pagos
**Descripción**: Lista todos los pagos según el rol del usuario autenticado.

**URL completa:** `http://localhost:3000/pagos`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": 1,
    "idUsuario": 123456789,
    "idActividad": 1,
    "monto": 50000,
    "horasTrabajadas": 4,
    "tarifaHora": 12500,
    "descripcion": "Pago por siembra de tomates",
    "fechaPago": "2024-01-15T00:00:00.000Z",
    "fechaCreacion": "2024-01-15T10:00:00.000Z",
    "usuario": {
      "identificacion": 123456789,
      "nombre": "Juan Pérez",
      "apellidos": "García",
      "tipoUsuario": {
        "nombre": "Pasante"
      }
    },
    "actividad": {
      "id": 1,
      "titulo": "Siembra de tomates",
      "usuario": {
        "identificacion": 111111111,
        "nombre": "María Instructor"
      },
      "responsable": {
        "identificacion": 222222222,
        "nombre": "Carlos Supervisor"
      }
    }
  }
]
```

### GET /pagos/usuario/:id
**Descripción**: Obtiene los pagos de un usuario específico (solo para pasantes).

**URL completa:** `http://localhost:3000/pagos/usuario/:id`

**Parámetros URL:**
- `id` (number): Identificación del usuario

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": 1,
    "idUsuario": 123456789,
    "idActividad": 1,
    "monto": 50000,
    "horasTrabajadas": 4,
    "tarifaHora": 12500,
    "descripcion": "Pago por siembra de tomates",
    "fechaPago": "2024-01-15T00:00:00.000Z",
    "fechaCreacion": "2024-01-15T10:00:00.000Z",
    "actividad": {
      "id": 1,
      "titulo": "Siembra de tomates"
    }
  }
]
```

### GET /pagos/:id
**Descripción**: Obtiene un pago específico por ID.

**URL completa:** `http://localhost:3000/pagos/:id`

**Parámetros URL:**
- `id` (number): ID del pago

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": 1,
  "idUsuario": 123456789,
  "idActividad": 1,
  "monto": 50000,
  "horasTrabajadas": 4,
  "tarifaHora": 12500,
  "descripcion": "Pago por siembra de tomates",
  "fechaPago": "2024-01-15T00:00:00.000Z",
  "fechaCreacion": "2024-01-15T10:00:00.000Z",
  "usuario": {
    "identificacion": 123456789,
    "nombre": "Juan Pérez",
    "apellidos": "García"
  },
  "actividad": {
    "id": 1,
    "titulo": "Siembra de tomates"
  }
}
```

### PUT /pagos/:id
**Descripción**: Actualiza un pago existente (solo instructores y administradores).

**URL completa:** `http://localhost:3000/pagos/:id`

**Parámetros URL:**
- `id` (number): ID del pago

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "monto": 55000,
  "horasTrabajadas": 4.5,
  "tarifaHora": 12222,
  "descripcion": "Pago actualizado por siembra de tomates",
  "fechaPago": "2024-01-16"
}
```

**Response:**
```json
{
  "id": 1,
  "idUsuario": 123456789,
  "idActividad": 1,
  "monto": 55000,
  "horasTrabajadas": 4.5,
  "tarifaHora": 12222,
  "descripcion": "Pago actualizado por siembra de tomates",
  "fechaPago": "2024-01-16T00:00:00.000Z",
  "fechaCreacion": "2024-01-15T10:00:00.000Z",
  "usuario": {
    "identificacion": 123456789,
    "nombre": "Juan Pérez",
    "apellidos": "García"
  },
  "actividad": {
    "id": 1,
    "titulo": "Siembra de tomates"
  }
}
```

## Entidad Pago

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "idUsuario": 123456789,
  "idActividad": 1,
  "monto": 50000,
  "horasTrabajadas": 4,
  "tarifaHora": 12500,
  "descripcion": "Pago por siembra de tomates",
  "fechaPago": "2024-01-15T00:00:00.000Z",
  "fechaCreacion": "2024-01-15T10:00:00.000Z",
  "usuario": {
    "identificacion": 123456789,
    "nombre": "Juan Pérez",
    "apellidos": "García",
    "correo": "juan.perez@pasante.edu",
    "telefono": "3001234567",
    "tipoUsuario": {
      "id": 2,
      "nombre": "Pasante"
    }
  },
  "actividad": {
    "id": 1,
    "titulo": "Siembra de tomates",
    "descripcion": "Proceso completo de siembra manual en sublotes preparados",
    "fecha": "2024-01-15T08:00:00.000Z",
    "estado": "completado",
    "horas": 4,
    "tarifaHora": 12500,
    "cultivo": {
      "id": 1,
      "nombre": "Tomates cherry",
      "estado": "Activo"
    }
  }
}
```

## DTOs y Validaciones

### CreatePagoDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `idUsuario` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `idActividad` | `number` | `@IsNumber, @IsNotEmpty` | - |
| `monto` | `number` | `@IsNumber, @Min(0)` | - |
| `horasTrabajadas` | `number` | `@IsNumber, @Min(0)` | - |
| `tarifaHora` | `number` | `@IsNumber, @Min(0)` | - |
| `descripcion` | `string` | `@IsString, @IsOptional` | - |
| `fechaPago` | `string` | `@IsDateString` | - |

### UpdatePagoDto
| Campo | Tipo | Validaciones | Mensaje de Error |
|-------|------|--------------|------------------|
| `monto` | `number` | `@IsNumber, @IsOptional, @Min(0)` | - |
| `horasTrabajadas` | `number` | `@IsNumber, @IsOptional, @Min(0)` | - |
| `tarifaHora` | `number` | `@IsNumber, @IsOptional, @Min(0)` | - |
| `descripcion` | `string` | `@IsString, @IsOptional` | - |
| `fechaPago` | `string` | `@IsOptional` | - |

## Funcionalidades Avanzadas

- **Registro Masivo**: Creación de múltiples pagos en una sola solicitud
- **Control de Acceso**: Diferentes permisos según rol (pasante, instructor, administrador)
- **Validación de Participación**: Verificación de que el pasante participó en la actividad
- **Prevención de Duplicados**: Evita pagos duplicados para la misma actividad y usuario
- **Cálculo Automático**: Recálculo del monto al modificar horas o tarifa
- **Registro de Gastos**: Creación automática de registro de gasto en el cultivo

## Flujo de Trabajo

1. **Creación**: Instructor o administrador registra pago por actividad completada
2. **Validación**: Sistema verifica participación del pasante en la actividad
3. **Registro**: Se crea el pago y automáticamente se registra como gasto en el cultivo
4. **Consulta**: Pasantes ven sus propios pagos, instructores ven pagos de sus actividades
5. **Actualización**: Instructores pueden modificar pagos si es necesario

## Integración con Otros Módulos

- **Actividades**: Pagos relacionados con actividades específicas realizadas por pasantes
- **Usuarios**: Distinción entre pasantes, instructores y administradores
- **Gastos de Producción**: Creación automática de registros de gastos por mano de obra
- **Cultivos**: Asociación de pagos con cultivos específicos
- **Trazabilidad**: Inclusión de pagos en el historial de eventos del cultivo