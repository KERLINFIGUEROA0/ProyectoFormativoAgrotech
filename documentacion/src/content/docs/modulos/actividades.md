---
title: "Módulo Actividades"
---

# Módulo Actividades

## Endpoints

### POST /actividades/registrar
**Descripción**: Crea una nueva actividad con imágenes opcionales (requiere autenticación JWT).

**URL completa:** `http://localhost:3000/actividades/registrar`

**Content-Type:** `multipart/form-data`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Parámetros Form-Data:**
- `titulo` (string): Título de la actividad
- `descripcion` (string, opcional): Descripción detallada
- `fecha` (string): Fecha de la actividad (ISO string)
- `cultivo` (number): ID del cultivo relacionado
- `materiales` (string JSON): Array de materiales usados
- `estado` (string, opcional): Estado inicial ("pendiente", "en proceso", "completado")
- `horas` (number, opcional): Horas estimadas
- `tarifaHora` (number, opcional): Tarifa por hora
- `files` (File[], opcional): Imágenes de evidencia (múltiples archivos)

**Ejemplo Request Body (Form-Data):**
```
titulo: Siembra de tomates
descripcion: Proceso completo de siembra manual en sublotes preparados
fecha: 2024-01-15T08:00:00.000Z
cultivo: 1
materiales: [{"materialId": 1, "cantidadUsada": 5}]
estado: pendiente
horas: 4
tarifaHora: 15000
files: [imagen1.jpg, imagen2.jpg]
```

**Response:**
```json
{
  "success": true,
  "message": "Actividad registrada exitosamente",
  "data": {
    "id": 1,
    "titulo": "Siembra de tomates",
    "descripcion": "Proceso completo de siembra manual en sublotes preparados",
    "fecha": "2024-01-15T08:00:00.000Z",
    "estado": "pendiente",
    "horas": 4,
    "tarifaHora": 15000,
    "img": "[\"imagen1.jpg\",\"imagen2.jpg\"]",
    "usuario": {
      "id": 1,
      "identificacion": "123456789",
      "nombre": "Juan Pérez"
    },
    "cultivo": {
      "id": 1,
      "nombre": "Tomates cherry",
      "estado": "Activo"
    },
    "materiales": [
      {
        "materialId": 1,
        "cantidadUsada": 5,
        "material": {
          "id": 1,
          "nombre": "Semillas de tomate",
          "tipoEmpaque": "Bolsa 1kg"
        }
      }
    ],
    "created_at": "2024-01-15T08:00:00.000Z",
    "updated_at": "2024-01-15T08:00:00.000Z"
  }
}
```

### GET /actividades/listar
**Descripción**: Lista todas las actividades del usuario autenticado con sus relaciones.

**URL completa:** `http://localhost:3000/actividades/listar`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "titulo": "Siembra de tomates",
      "descripcion": "Proceso completo de siembra manual en sublotes preparados",
      "fecha": "2024-01-15T08:00:00.000Z",
      "estado": "completado",
      "horas": 4,
      "tarifaHora": 15000,
      "img": "[\"siembra1.jpg\",\"siembra2.jpg\"]",
      "usuario": {
        "id": 1,
        "identificacion": "123456789",
        "nombre": "Juan Pérez",
        "tipoUsuario": {
          "id": 1,
          "nombre": "Instructor"
        }
      },
      "cultivo": {
        "id": 1,
        "nombre": "Tomates cherry",
        "estado": "Activo",
        "lote": {
          "id": 1,
          "nombre": "Lote Principal"
        }
      },
      "materiales": [
        {
          "materialId": 1,
          "cantidadUsada": 5,
          "material": {
            "id": 1,
            "nombre": "Semillas de tomate",
            "tipoEmpaque": "Bolsa 1kg",
            "precio": 25000
          }
        }
      ],
      "respuestas": [],
      "created_at": "2024-01-15T08:00:00.000Z",
      "updated_at": "2024-01-16T16:30:00.000Z"
    }
  ]
}
```

### GET /actividades/search
**Descripción**: Busca actividades por criterios específicos.

**URL completa:** `http://localhost:3000/actividades/search`

**Query Parameters:**
- `q` (opcional): Búsqueda general
- `titulo` (opcional): Buscar por título
- `estado` (opcional): Filtrar por estado

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

### GET /actividades/listar/:id
**Descripción**: Obtiene una actividad específica por ID.

**URL completa:** `http://localhost:3000/actividades/listar/:id`

**Parámetros URL:**
- `id` (number): ID de la actividad

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "titulo": "Siembra de tomates",
    "descripcion": "Proceso completo de siembra",
    "fecha": "2024-01-15T00:00:00.000Z",
    "estado": "completado",
    "horas": 4,
    "tarifaHora": 15000,
    "img": "[\"imagen1.jpg\",\"imagen2.jpg\"]",
    "usuario": { ... },
    "cultivo": { ... },
    "materiales": [ ... ]
  }
}
```

### PATCH /actividades/:id
**Descripción**: Actualiza una actividad existente.

**URL completa:** `http://localhost:3000/actividades/:id`

**Content-Type:** `multipart/form-data`

**Parámetros URL:**
- `id` (number): ID de la actividad

**Parámetros:**
- `titulo`, `descripcion`, `estado`, etc. (igual que crear)
- `files` (opcional): Nuevas imágenes

**Response:**
```json
{
  "success": true,
  "message": "Actividad actualizada exitosamente",
  "data": { ... }
}
```

### DELETE /actividades/:id
**Descripción**: Elimina una actividad.

**URL completa:** `http://localhost:3000/actividades/:id`

**Parámetros URL:**
- `id` (number): ID de la actividad

**Response:**
```json
{
  "success": true,
  "message": "Actividad eliminada exitosamente"
}
```

### POST /actividades/:id/respuesta
**Descripción**: Envía una respuesta a una actividad asignada (para aprendices).

**URL completa:** `http://localhost:3000/actividades/:id/respuesta`

**Content-Type:** `multipart/form-data`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Parámetros URL:**
- `id` (number): ID de la actividad

**Parámetros Form-Data:**
- `respuesta` (string): Texto descriptivo del trabajo realizado
- `archivos` (string JSON, opcional): Archivos existentes (si se actualiza respuesta)
- `files` (File[], opcional): Nuevos archivos de evidencia del trabajo

**Ejemplo Request Body (Form-Data):**
```
respuesta: Se completó la preparación del suelo siguiendo las especificaciones técnicas. Se realizó labranza a 30cm de profundidad y se incorporaron los fertilizantes según el plano proporcionado.
archivos: []
files: [trabajo_completado.jpg, evidencia_suelo.jpg]
```

**Response:**
```json
{
  "success": true,
  "message": "Respuesta enviada exitosamente",
  "data": {
    "id": 1,
    "actividadId": 5,
    "usuarioId": 2,
    "respuesta": "Se completó la preparación del suelo siguiendo las especificaciones técnicas. Se realizó labranza a 30cm de profundidad y se incorporaron los fertilizantes según el plano proporcionado.",
    "archivos": "[\"trabajo_completado.jpg\",\"evidencia_suelo.jpg\"]",
    "fechaEnvio": "2024-01-16T14:30:00.000Z",
    "usuario": {
      "id": 2,
      "nombre": "María García",
      "identificacion": "987654321"
    },
    "created_at": "2024-01-16T14:30:00.000Z"
  }
}
```

### GET /actividades/:id/respuestas
**Descripción**: Obtiene todas las respuestas enviadas para una actividad específica.

**URL completa:** `http://localhost:3000/actividades/:id/respuestas`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Parámetros URL:**
- `id` (number): ID de la actividad

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "actividadId": 5,
      "usuarioId": 2,
      "respuesta": "Se completó la preparación del suelo siguiendo las especificaciones técnicas. Se realizó labranza a 30cm de profundidad y se incorporaron los fertilizantes según el plano proporcionado.",
      "archivos": "[\"trabajo_completado.jpg\",\"evidencia_suelo.jpg\"]",
      "fechaEnvio": "2024-01-16T14:30:00.000Z",
      "usuario": {
        "id": 2,
        "identificacion": "987654321",
        "nombre": "María García",
        "apellidos": "Rodríguez",
        "ficha": {
          "id": 1,
          "nombre": "Ficha Técnica Agrícola"
        }
      },
      "calificaciones": [
        {
          "id": 1,
          "calificacion": 4.5,
          "comentario": "Excelente trabajo realizado. La profundidad de labranza fue correcta y los fertilizantes se incorporaron adecuadamente.",
          "instructor": {
            "id": 1,
            "nombre": "Juan Pérez"
          },
          "fechaCalificacion": "2024-01-16T16:00:00.000Z"
        }
      ],
      "created_at": "2024-01-16T14:30:00.000Z"
    }
  ]
}
```

### PATCH /actividades/respuesta/:respuestaId/calificar
**Descripción**: Califica una respuesta de actividad enviada por un aprendiz (instructores).

**URL completa:** `http://localhost:3000/actividades/respuesta/:respuestaId/calificar`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Parámetros URL:**
- `respuestaId` (number): ID de la respuesta a calificar

**Request Body:**
```json
{
  "calificacion": 4.5,
  "comentario": "Excelente trabajo realizado. La profundidad de labranza fue correcta y los fertilizantes se incorporaron adecuadamente."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Respuesta calificada exitosamente",
  "data": {
    "id": 1,
    "respuestaId": 5,
    "calificacion": 4.5,
    "comentario": "Excelente trabajo realizado. La profundidad de labranza fue correcta y los fertilizantes se incorporaron adecuadamente.",
    "instructorId": 1,
    "fechaCalificacion": "2024-01-16T16:00:00.000Z",
    "instructor": {
      "id": 1,
      "nombre": "Juan Pérez",
      "tipoUsuario": {
        "nombre": "Instructor"
      }
    },
    "created_at": "2024-01-16T16:00:00.000Z"
  }
}
```

### PATCH /actividades/:id/calificar
**Descripción**: Califica una actividad completa (instructores).

**URL completa:** `http://localhost:3000/actividades/:id/calificar`

**Parámetros URL:**
- `id` (number): ID de la actividad

**Request Body:**
```json
{
  "calificacion": 4.8,
  "comentario": "Actividad ejecutada perfectamente"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Actividad calificada exitosamente",
  "data": { ... }
}
```

### GET /actividades/descargar/:filename
**Descripción**: Descarga un archivo de evidencia.

**URL completa:** `http://localhost:3000/actividades/descargar/:filename`

**Parámetros URL:**
- `filename` (string): Nombre del archivo

**Query Parameters:**
- `nombre` (opcional): Nombre original del archivo

**Response:** Archivo descargable

### POST /actividades/asignar
**Descripción**: Asigna una actividad a múltiples aprendices con materiales e instrucciones.

**URL completa:** `http://localhost:3000/actividades/asignar`

**Content-Type:** `multipart/form-data`

**Parámetros Form-Data:**
- `cultivo` (number): ID del cultivo donde se realiza la actividad
- `titulo` (string): Título descriptivo de la actividad
- `descripcion` (string): Instrucciones detalladas para los aprendices
- `fecha` (string): Fecha límite para completar la actividad
- `aprendices` (string JSON): Array de IDs de usuarios aprendices
- `materiales` (string JSON, opcional): Array de materiales requeridos
- `estado` (string, opcional): Estado inicial ("pendiente")
- `files` (File[], opcional): Archivos iniciales de referencia

**Ejemplo Request Body (Form-Data):**
```
cultivo: 1
titulo: Preparación de suelo para siembra
descripcion: Realizar labranza profunda y preparación del terreno según especificaciones técnicas
fecha: 2024-01-20T17:00:00.000Z
aprendices: [2, 3, 5]
materiales: [{"materialId": 1, "cantidadUsada": 10}, {"materialId": 3, "cantidadUsada": 2}]
estado: pendiente
files: [instrucciones.pdf, plano_suelo.jpg]
```

**Response:**
```json
{
  "success": true,
  "message": "Actividad asignada exitosamente",
  "data": {
    "actividadId": 1,
    "titulo": "Preparación de suelo para siembra",
    "cultivo": {
      "id": 1,
      "nombre": "Tomates cherry"
    },
    "aprendicesAsignados": 3,
    "materialesRequeridos": 2,
    "archivoInicial": "[\"instrucciones.pdf\",\"plano_suelo.jpg\"]",
    "fechaLimite": "2024-01-20T17:00:00.000Z",
    "created_at": "2024-01-15T10:00:00.000Z"
  }
}
```

## Entidad Actividad

**Ejemplo completo en formato JSON:**
```json
{
  "id": 1,
  "titulo": "Siembra de tomates",
  "descripcion": "Proceso completo de siembra manual en sublotes preparados",
  "fecha": "2024-01-15T08:00:00.000Z",
  "estado": "completado",
  "horas": 4,
  "tarifaHora": 15000,
  "img": "[\"siembra1.jpg\",\"siembra2.jpg\"]",
  "usuario": {
    "id": 1,
    "identificacion": "123456789",
    "nombre": "Juan Pérez",
    "apellidos": "García",
    "correo": "juan.perez@instructor.edu",
    "telefono": "3001234567",
    "tipoUsuario": {
      "id": 1,
      "nombre": "Instructor"
    }
  },
  "cultivo": {
    "id": 1,
    "nombre": "Tomates cherry",
    "estado": "Activo",
    "tipoCultivo": {
      "id": 1,
      "nombre": "Hortaliza"
    },
    "lote": {
      "id": 1,
      "nombre": "Lote Principal",
      "area": 1500.5
    },
    "sublote": {
      "id": 1,
      "nombre": "Sublote Norte"
    }
  },
  "materiales": [
    {
      "id": 1,
      "materialId": 1,
      "cantidadUsada": 5,
      "material": {
        "id": 1,
        "nombre": "Semillas de tomate",
        "tipoEmpaque": "Bolsa 1kg",
        "precio": 25000,
        "cantidad": 100,
        "tipoCategoria": "Semillas",
        "tipoMaterial": "Vegetal"
      }
    }
  ],
  "respuestas": [
    {
      "id": 1,
      "actividadId": 1,
      "usuarioId": 2,
      "respuesta": "Se completó la siembra siguiendo todas las especificaciones técnicas. Se sembraron 5 semillas por metro lineal con separación de 30cm entre plantas.",
      "archivos": "[\"siembra_completada.jpg\",\"evidencia_calidad.jpg\"]",
      "fechaEnvio": "2024-01-16T14:30:00.000Z",
      "usuario": {
        "id": 2,
        "identificacion": "987654321",
        "nombre": "María García",
        "apellidos": "Rodríguez",
        "ficha": {
          "id": 1,
          "nombre": "Ficha Técnica Agrícola",
          "id_ficha": "12345678"
        }
      },
      "calificaciones": [
        {
          "id": 1,
          "calificacion": 4.8,
          "comentario": "Excelente trabajo. La profundidad de siembra fue correcta y la separación entre plantas adecuada. Las semillas se colocaron con precisión.",
          "instructor": {
            "id": 1,
            "nombre": "Juan Pérez"
          },
          "fechaCalificacion": "2024-01-16T16:00:00.000Z"
        }
      ],
      "created_at": "2024-01-16T14:30:00.000Z"
    }
  ],
  "created_at": "2024-01-15T08:00:00.000Z",
  "updated_at": "2024-01-16T16:30:00.000Z"
}
```

## Estados de Actividad

- **pendiente**: Actividad creada pero no iniciada
- **en proceso**: Actividad en ejecución
- **completado**: Actividad finalizada exitosamente
- **cancelado**: Actividad cancelada

## DTOs y Validaciones

### CreateActividadDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `titulo` | `string` | - | - |
| `fecha` | `Date` | - | - |
| `descripcion` | `string` | `@IsOptional, @IsString` | - |
| `materiales` | `MaterialUsadoDto[]` | `@IsOptional, @ValidateNested` | - |
| `img` | `string` | `@IsOptional, @IsString` | - |
| `usuario` | `number` | `@IsOptional, @IsNumber` | - |
| `cultivo` | `number` | - | - |
| `estado` | `string` | `@IsOptional, @IsIn(['pendiente', 'en proceso', 'completado'])` | - |
| `horas` | `number` | `@IsOptional, @Min(0)` | - |
| `tarifaHora` | `number` | `@IsOptional, @Min(0)` | - |

###  MaterialUsadoDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `materialId` | `number` | `@IsNumber, @IsPositive` | - |
| `cantidadUsada` | `number` | `@IsNumber, @IsPositive` | - |

###  UpdateActividadDto
Similar a CreateActividadDto con campos opcionales.

###  AsignarActividadDto
| Campo | Tipo |  Validaciones |  Mensaje de Error |
|-------|------|----------------|-------------------|
| `cultivo` | `number` | - | - |
| `titulo` | `string` | - | - |
| `descripcion` | `string` | - | - |
| `fecha` | `string` | - | - |
| `aprendices` | `number[]` | `@ArrayNotEmpty, @IsNumber({}, { each: true })` | - |
| `materiales` | `MaterialUsadoDto[]` | `@IsOptional, @ValidateNested` | - |
| `estado` | `string` | `@IsOptional, @IsIn(['pendiente', 'en proceso', 'completado'])` | - |

## Funcionalidades Avanzadas

- **Gestión de Imágenes**: Upload múltiple de evidencia fotográfica
- **Sistema de Calificación**: Evaluación de trabajos por instructores
- **Asignación Masiva**: Distribución de tareas a múltiples aprendices
- **Control de Materiales**: Seguimiento de insumos utilizados
- **Sistema de Respuestas**: Comunicación bidireccional instructor-aprendiz
- **Archivos de Evidencia**: Gestión completa de documentos y fotos

## Flujo de Trabajo

1. **Creación**: Instructor crea actividad con materiales requeridos
2. **Asignación**: Actividad se asigna a aprendices específicos
3. **Ejecución**: Aprendices completan trabajo y envían evidencia
4. **Revisión**: Instructores evalúan respuestas y calificaciones
5. **Cierre**: Actividad se marca como completada con evaluación final

## Integración con Otros Módulos

- **Cultivos**: Actividades relacionadas con cultivos específicos
- **Materiales**: Control de inventario y consumo
- **Usuarios**: Distinción entre instructores y aprendices
- **Lotes/Sublotes**: Ubicación geográfica de las actividades