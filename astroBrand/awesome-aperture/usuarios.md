# Módulo Usuarios

## Endpoints

### POST /usuarios/crear
**Descripción**: Crea un nuevo usuario.

**DTO: CreateUsuarioDto**
- `Tipo_Identificacion` (string, requerido): Tipo de ID ("CC" o "TI")
- `identificacion` (number, requerido): Número de identificación
- `nombre` (string, requerido): Nombre del usuario
- `apellidos` (string, requerido): Apellidos del usuario
- `telefono` (string, requerido): Teléfono (10 dígitos)
- `correo` (string, requerido): Correo electrónico único
- `password` (string, requerido): Contraseña (mín. 8 caracteres)
- `tipoUsuario` (number, requerido): ID del rol/usuario
- `id_ficha` (string, opcional): ID de ficha para aprendices/pasantes (6-8 dígitos)

### POST /usuarios/cargar-excel
**Descripción**: Carga usuarios masivamente desde archivo Excel.

**Body (form-data)**:
- `file` (file): Archivo Excel con columnas específicas

### GET /usuarios/exportar-excel
**Descripción**: Exporta lista de usuarios a Excel (excluye administradores).

### GET /usuarios
**Descripción**: Lista todos los usuarios.

### GET /usuarios/buscar
**Descripción**: Busca usuarios por criterios.

**Parámetros Query**:
- `nombre` (string, opcional): Búsqueda por nombre/apellidos
- `identificacion` (string, opcional): Búsqueda por identificación
- `rol` (string, opcional): Búsqueda por nombre de rol

### GET /usuarios/asignables
**Descripción**: Lista usuarios asignables (aprendices y pasantes activos).

### GET /usuarios/buscar/:id
**Descripción**: Obtiene un usuario específico por ID.

**Parámetros URL**:
- `id` (number): ID del usuario

### PUT /usuarios/actualizar/:id
**Descripción**: Actualiza un usuario existente.

**Parámetros URL**:
- `id` (number): ID del usuario

**DTO: UpdateUsuarioDto** (mismos campos que CreateUsuarioDto, todos opcionales)

### DELETE /usuarios/eliminar/:id
**Descripción**: Desactiva un usuario (soft delete).

**Parámetros URL**:
- `id` (number): ID del usuario

### PATCH /usuarios/reactivar/:id
**Descripción**: Reactiva un usuario desactivado.

**Parámetros URL**:
- `id` (number): ID del usuario

### DELETE /usuarios/eliminar-permanente/:id
**Descripción**: Elimina permanentemente un usuario.

**Parámetros URL**:
- `id` (number): ID del usuario

### GET /usuarios/identificacion/:identificacion
**Descripción**: Busca usuario por número de identificación.

**Parámetros URL**:
- `identificacion` (number): Número de identificación

### POST /usuarios/cambiarpassword
**Descripción**: Cambia la contraseña del usuario autenticado.

**Body**:
- `actual` (string): Contraseña actual
- `nueva` (string): Nueva contraseña

### GET /usuarios/perfil
**Descripción**: Obtiene el perfil del usuario autenticado con permisos.

### PUT /usuarios/editarperfil
**Descripción**: Actualiza el perfil del usuario autenticado.

**DTO: UpdatePerfilDto**
- `tipoIdentificacion` (string, opcional): Tipo de ID
- `identificacion` (number, opcional): Número de ID
- `nombres` (string, opcional): Nombre
- `apellidos` (string, opcional): Apellidos
- `correo` (string, opcional): Correo
- `telefono` (string, opcional): Teléfono

### POST /usuarios/fotoperfil
**Descripción**: Sube foto de perfil del usuario autenticado.

**Body (form-data)**:
- `file` (file): Archivo de imagen

### GET /usuarios/fotoperfil
**Descripción**: Obtiene la foto de perfil del usuario autenticado.

### GET /usuarios/fichas/opciones
**Descripción**: Lista opciones de fichas disponibles.

### POST /usuarios/exportar-excel-filtrado
**Descripción**: Exporta usuarios filtrados a Excel.

**Body**: Objeto con filtros (searchTerm, filterStatus, filterRol, filterFicha)

## Entidad Usuario

```typescript
{
  id: number; // ID único del usuario
  Tipo_Identificacion: string; // Tipo de ID ("CC" o "TI")
  identificacion: number; // Número de identificación
  foto: string; // Ruta de la foto de perfil
  nombre: string; // Nombre
  apellidos: string; // Apellidos
  telefono: string; // Teléfono
  correo: string; // Correo electrónico
  passwordHash: string; // Hash de la contraseña
  resetToken: string; // Token de recuperación
  resetExpira: Date; // Expiración del token
  estado: boolean; // Estado activo/inactivo
  tipoUsuario: TipoUsuario; // Rol del usuario
  ficha: Ficha; // Ficha asignada (opcional)
  actividades: Actividad[]; // Actividades asignadas
  usuarioPermisos: UsuarioPermiso[]; // Permisos individuales
}
```

## Funcionalidades Adicionales

- **Autenticación**: Hashing con bcrypt, recuperación de contraseña por email
- **Roles y Permisos**: Sistema basado en roles con permisos individuales
- **Gestión de Fichas**: Asignación automática para aprendices y pasantes
- **Soft Delete**: Desactivación en lugar de eliminación permanente
- **Importación Masiva**: Carga desde Excel con validaciones
- **Exportación**: Reportes Excel con filtros
- **Foto de Perfil**: Upload y gestión de imágenes
- **Validación**: Unicidad de correo e identificación