---
title: "Arquitectura Backend"
---

# Arquitectura del Backend

El backend está construido con NestJS, siguiendo una arquitectura modular y limpia. Utiliza TypeORM para la base de datos PostgreSQL, JWT para autenticación, Redis para cache, y MQTT para integración IoT. A continuación, diagramas que ilustran la estructura general, relaciones de entidades y flujos por módulo.

## Diagrama General de Arquitectura

```mermaid
graph TD
    A[Cliente HTTP] --> B[Controladores]
    B --> C[JwtAuthGuard]
    C --> D[Servicios]
    D --> E[DTOs - Validaciones]
    D --> F[Entidades]
    F --> G[TypeORM]
    G --> H[(PostgreSQL)]
    D --> I[(Redis Cache)]
    D --> J[MQTT IoT]
    K[JwtStrategy] --> C
    L[Multer Upload] --> D
```

### Descripción
- **Controladores**: Manejan endpoints REST, protegidos por guards.
- **Servicios**: Contienen lógica de negocio, interactúan con entidades y DTOs.
- **Entidades**: Modelos de DB con decoradores TypeORM.
- **DTOs**: Validan entradas/salidas.
- **Infraestructura**: Cache, IoT, auth y uploads.

## Diagrama ER Simplificado de Entidades

```mermaid
erDiagram
    Usuario ||--o{ Cultivo : "gestiona"
    Usuario ||--o{ Lote : "administra"
    Lote ||--o{ Sublote : "contiene"
    Sublote ||--o{ Cultivo : "tiene"
    Cultivo ||--o{ Produccion : "produce"
    Produccion ||--o{ Venta : "vende"
    Cultivo ||--o{ Actividad : "asociada"
    Material ||--o{ Actividad : "usado en"
    Usuario ||--o{ Permiso : "tiene"
```

### Descripción
- **Relaciones principales**: Usuario administra lotes y cultivos, lotes contienen sublotes, sublotes tienen cultivos, cultivos producen y generan ventas.
- **Tipos**: 1:N (uno a muchos), opcionales con "o".
- **Ver diagrama completo** más abajo para todas las entidades y relaciones detalladas.

## Diagrama Específico del Módulo de Usuarios

```mermaid
graph LR
    A[Cliente Frontend] --> B[POST /usuarios]
    B --> C[UsuariosController]
    C --> D[JwtAuthGuard]
    D --> E[UsuariosService]
    E --> F[CreateUsuarioDto]
    E --> G[Usuario Entity]
    G --> H[TypeORM]
    H --> I[(PostgreSQL)]
    E --> J[(Redis Cache)]
    E --> K[Respuesta Exitosa]
```

### Descripción
- Flujo típico: Request → Guard → Service → DTO/Entity → DB/Redis → Response.
- Similar para otros módulos (cultivos, lotes, etc.), reemplazando entidades/DTOs.

## Diagrama Específico del Módulo de Cultivos

```mermaid
graph LR
    A[Cliente Frontend] --> B[POST /cultivos]
    B --> C[CultivosController]
    C --> D[JwtAuthGuard]
    D --> E[CultivosService]
    E --> F[CreateCultivoDto]
    E --> G[Cultivo Entity]
    G --> H[TypeORM]
    H --> I[(PostgreSQL)]
    E --> J[Respuesta Exitosa]
```

## Diagrama Específico del Módulo de Lotes

```mermaid
graph LR
    A[Cliente Frontend] --> B[POST /lotes]
    B --> C[LotesController]
    C --> D[JwtAuthGuard]
    D --> E[LotesService]
    E --> F[CreateLoteDto]
    E --> G[Lote Entity]
    G --> H[TypeORM]
    H --> I[(PostgreSQL)]
    E --> J[Respuesta Exitosa]
```

## Estructura Completa de la Base de Datos

```mermaid
erDiagram
    Usuario {
        int id PK
        varchar tipo_identificacion
        varchar identificacion UK
        varchar nombre
        varchar apellidos
        varchar telefono
        varchar correo UK
        varchar password
        int tipo_usuario_id FK
        varchar id_ficha
        boolean estado
        datetime created_at
        datetime updated_at
    }

    TipoUsuario {
        int id PK
        varchar nombre
        varchar descripcion
        datetime created_at
    }

    Permiso {
        int id PK
        varchar nombre
        varchar descripcion
        datetime created_at
    }

    UsuarioPermiso {
        int id PK
        int usuario_id FK
        int permiso_id FK
        boolean estado
    }

    RolPermiso {
        int id PK
        int tipo_usuario_id FK
        int permiso_id FK
    }

    Modulo {
        int id PK
        varchar nombre
        varchar descripcion
    }

    Ficha {
        int id PK
        varchar nombre
        varchar id_ficha UK
        datetime created_at
    }

    Lote {
        int id PK
        varchar nombre
        decimal area
        varchar estado
        json coordenadas
        int usuario_id FK
        datetime created_at
        datetime updated_at
    }

    Sublote {
        int id PK
        varchar nombre
        varchar descripcion
        int lote_id FK
        int cultivo_id FK
        boolean activo_mqtt
        varchar estado
        datetime created_at
        datetime updated_at
    }

    Cultivo {
        int id PK
        varchar nombre
        int cantidad
        varchar img
        varchar descripcion
        int tipo_cultivo_id FK
        varchar estado
        date fecha_plantado
        date fecha_fin
        int lote_id FK
        int usuario_id FK
        datetime created_at
        datetime updated_at
    }

    TipoCultivo {
        int id PK
        varchar nombre
        varchar descripcion
        datetime created_at
    }

    Produccion {
        int id PK
        int cantidad
        int cantidad_original
        date fecha
        varchar estado
        int cultivo_id FK
        datetime created_at
        datetime updated_at
    }

    Venta {
        int id PK
        varchar descripcion
        decimal monto
        date fecha
        int cantidad
        int produccion_id FK
        varchar tipo_movimiento
        varchar ruta_factura_pdf
        datetime created_at
    }

    Gasto {
        int id PK
        varchar descripcion
        decimal monto
        date fecha
        int produccion_id FK
        int cultivo_id FK
        datetime created_at
    }

    Material {
        int id PK
        varchar nombre
        decimal cantidad
        decimal precio
        varchar descripcion
        varchar ubicacion
        varchar proveedor
        date fecha_vencimiento
        decimal peso_por_unidad
        boolean estado
        varchar tipo_categoria
        varchar tipo_material
        varchar medidas_de_contenido
        varchar tipo_empaque
        datetime created_at
        datetime updated_at
    }

    Actividad {
        int id PK
        varchar titulo
        varchar descripcion
        date fecha
        varchar img
        varchar estado
        int usuario_id FK
        int cultivo_id FK
        int lote_id FK
        int sublote_id FK
        decimal horas
        decimal tarifa_hora
        datetime created_at
        datetime updated_at
    }

    ActividadMaterial {
        int id PK
        int actividad_id FK
        int material_id FK
        decimal cantidad_usada
    }

    ActividadUsuario {
        int id PK
        int actividad_id FK
        int usuario_id FK
    }

    RespuestaActividad {
        int id PK
        varchar descripcion
        varchar archivos
        datetime fecha_envio
        varchar estado
        varchar comentario_instructor
        int actividad_id FK
        int usuario_id FK
    }

    Pago {
        int id PK
        int id_usuario
        int id_actividad
        decimal monto
        decimal horas_trabajadas
        decimal tarifa_hora
        varchar descripcion
        date fecha_pago
        datetime fecha_creacion
    }

    Movimiento {
        int id PK
        varchar tipo
        decimal cantidad
        varchar descripcion
        varchar referencia
        int material_id FK
        int usuario_id FK
        datetime fecha
    }

    Sensor {
        int id PK
        varchar nombre
        date fecha_instalacion
        decimal valor_minimo_alerta
        decimal valor_maximo_alerta
        varchar estado
        varchar topic
        int sublote_id FK
        int tipo_sensor_id FK
        datetime created_at
        datetime updated_at
    }

    TipoSensor {
        int id PK
        varchar nombre
        datetime created_at
    }

    InformacionSensor {
        int id PK
        varchar sensor_key
        varchar valor
        datetime fecha
        int sensor_id FK
    }

    Broker {
        int id PK
        varchar nombre
        varchar protocolo
        varchar host
        int puerto
        varchar usuario
        varchar password
        varchar prefijo_topicos
        json topicos_adicionales
        json umbrales
        datetime created_at
    }

    BrokerLote {
        int id PK
        int broker_id FK
        int lote_id FK
        json topicos
        int puerto
        varchar topic_prueba
        boolean is_active
    }

    Subscripcion {
        int id PK
        int broker_id FK
        varchar topic
        int qos
    }

    Tratamiento {
        int id PK
        varchar descripcion
        date fecha_inicio
        date fecha_final
        varchar tipo
        varchar estado
        int cultivo_id FK
        datetime created_at
        datetime updated_at
    }

    Epa {
        int id PK
        date fecha_encuentro
        varchar nombre
        varchar descripcion
        varchar tipo_enfermedad
        varchar deficiencias
        varchar img
        varchar complicaciones
        datetime created_at
    }

    CultivoEpa {
        int id PK
        int cultivo_id FK
        int epa_id FK
    }

    EpaTratamiento {
        int id PK
        int tratamiento_id FK
        int epa_id FK
    }

    Usuario ||--o{ Ficha : "tiene"
    Usuario ||--o{ Lote : "administra"
    Usuario ||--o{ Cultivo : "gestiona"
    Usuario ||--o{ Actividad : "realiza"
    Usuario }o--o{ UsuarioPermiso : "tiene"
    UsuarioPermiso }o--|| Permiso : "accede"
    Usuario ||--o{ Movimiento : "registra"
    Usuario ||--o{ Pago : "recibe"
    Usuario ||--o{ RespuestaActividad : "envia"
    Usuario ||--o{ ActividadUsuario : "asignado"

    TipoUsuario ||--o{ Usuario : "clasifica"
    TipoUsuario ||--o{ RolPermiso : "tiene"

    RolPermiso }o--|| Permiso : "accede"

    Modulo ||--o{ Permiso : "contiene"

    Lote ||--o{ Sublote : "contiene"
    Lote ||--o{ Cultivo : "alberga"
    Lote ||--o{ BrokerLote : "conecta"

    Sublote ||--o{ Sensor : "monitorea"
    Sublote ||--o{ Cultivo : "tiene"
    Sublote ||--o{ Actividad : "asociada"

    Cultivo ||--o{ Produccion : "produce"
    Cultivo ||--o{ Actividad : "asociada"
    Cultivo ||--o{ Tratamiento : "recibe"
    Cultivo }o--o{ CultivoEpa : "relacionada"
    Cultivo ||--o{ Gasto : "tiene"

    TipoCultivo ||--o{ Cultivo : "define"

    Produccion ||--o{ Venta : "vende"
    Produccion ||--o{ Gasto : "tiene"

    Material ||--o{ ActividadMaterial : "usado en"
    Material ||--o{ Movimiento : "afecta"

    Actividad ||--o{ ActividadMaterial : "consume"
    Actividad ||--o{ RespuestaActividad : "tiene"
    Actividad ||--o{ ActividadUsuario : "asigna"
    Actividad ||--o{ Pago : "genera"

    Sensor }o--|| TipoSensor : "clasifica"
    Sensor ||--o{ InformacionSensor : "registra"

    Broker ||--o{ BrokerLote : "conecta"
    Broker ||--o{ Subscripcion : "tiene"

    Tratamiento ||--o{ EpaTratamiento : "aplica"

    Epa ||--o{ EpaTratamiento : "tratada"
    Epa ||--o{ CultivoEpa : "afecta"
```

### Descripción de las Tablas y su Contenido

#### **Entidades de Usuarios y Seguridad:**
- **Usuario**: Datos personales, credenciales, rol y ficha académica
- **Ficha**: Información académica (id_ficha, nombre)
- **TipoUsuario**: Roles del sistema (Admin, Agricultor, etc.)
- **Permiso**: Accesos específicos del sistema
- **UsuarioPermiso**: Relación muchos a muchos usuarios-permisos
- **RolPermiso**: Relación muchos a muchos roles-permisos
- **Modulo**: Agrupaciones de permisos del sistema

#### **Entidades Geográficas y Agrícolas:**
- **Lote**: Áreas de terreno con coordenadas geográficas
- **Sublote**: Subdivisiones dentro de lotes para cultivos específicos
- **Cultivo**: Plantaciones con tipo, estado y fechas
- **TipoCultivo**: Catálogo de tipos de cultivos disponibles

#### **Entidades de Producción y Ventas:**
- **Produccion**: Cosechas con cantidades y estados
- **Venta**: Transacciones comerciales con facturación
- **Gasto**: Costos asociados a producciones

#### **Entidades de Inventario y Actividades:**
- **Material**: Insumos con categorías, tipos y empaques
- **Actividad**: Trabajos realizados con materiales usados
- **ActividadMaterial**: Relación consumo de materiales
- **ActividadUsuario**: Asignación de actividades a usuarios
- **RespuestaActividad**: Respuestas y evaluaciones de actividades
- **Pago**: Pagos por actividades realizadas
- **Movimiento**: Registro de movimientos de inventario

#### **Entidades IoT y Monitoreo:**
- **Sensor**: Dispositivos de medición con alertas
- **TipoSensor**: Clasificación de sensores
- **InformacionSensor**: Datos históricos de sensores
- **Broker**: Servidores MQTT para comunicación
- **BrokerLote**: Conexión entre brokers y lotes
- **Subscripcion**: Tópicos MQTT suscritos

#### **Entidades Fitosanitarias:**
- **Epa**: Problemas fitosanitarios detectados
- **Tratamiento**: Soluciones aplicadas
- **CultivoEpa**: Relación cultivos afectados
- **EpaTratamiento**: Tratamientos aplicados a problemas

#### **Relaciones Clave:**
- **Jerarquía**: Usuario → Lote → Sublote → Cultivo → Produccion → Venta
- **Control**: Usuario administra lotes, cultivos y actividades
- **Consumo**: Actividades usan materiales, producciones generan gastos, movimientos rastrean inventario
- **Monitoreo**: Sublotes tienen sensores conectados via MQTT, brokers conectan lotes
- **Salud**: Cultivos pueden tener problemas (Epa) que requieren tratamientos
- **Aprendizaje**: Actividades asignadas a usuarios generan respuestas, pagos y evaluaciones

## Diagrama de Secuencia - Flujo Típico de Operación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend (React)
    participant B as Backend (NestJS)
    participant G as JwtAuthGuard
    participant C as Controller
    participant S as Service
    participant D as DTO Validation
    participant E as Entity
    participant T as TypeORM
    participant DB as PostgreSQL
    participant R as Redis Cache

    U->>F: Interacción (click, form)
    F->>B: HTTP Request + JWT Token
    B->>G: Validar Token
    G->>G: Verificar expiración y firma
    G->>C: Token válido, continuar
    C->>D: Validar DTO con class-validator
    D->>S: DTO válido, procesar lógica
    S->>R: Verificar cache (opcional)
    R-->>S: Datos en cache (o no)
    S->>E: Crear/actualizar entidad
    E->>T: Ejecutar operaciones DB
    T->>DB: Query SQL (INSERT/UPDATE/SELECT)
    DB-->>T: Resultado
    T-->>E: Entidad procesada
    E-->>S: Datos procesados
    S->>R: Actualizar cache (opcional)
    S-->>C: Respuesta exitosa
    C-->>B: Formatear respuesta JSON
    B-->>F: HTTP Response (200 OK)
    F-->>U: Mostrar resultado al usuario
```

### Descripción del Flujo de Secuencia
1. **Usuario** interactúa con la interfaz
2. **Frontend** envía request HTTP con JWT
3. **JwtAuthGuard** valida el token
4. **Controller** recibe la petición
5. **DTO Validation** valida los datos de entrada
6. **Service** ejecuta la lógica de negocio
7. **Redis Cache** acelera consultas frecuentes
8. **Entity + TypeORM** maneja la persistencia
9. **PostgreSQL** almacena los datos
10. **Respuesta** retorna al usuario

## Diagramas de Casos de Uso - Sistema AgroTech

### Actores del Sistema
- **Administrador**: Control total del sistema, gestión de usuarios y configuración
- **Agricultor**: Gestión operativa de cultivos, lotes, producciones y ventas
- **Aprendiz**: Participación en actividades de aprendizaje y formación
- **Sistema IoT**: Sensores y dispositivos que envían datos automáticamente

---

### Diagrama 1: Gestión de Usuarios y Seguridad

```mermaid
graph TD
    subgraph "Actores"
        A1[Administrador]
        A2[Agricultor]
        A3[Aprendiz]
    end

    subgraph "Gestión de Usuarios"
        UC1[Crear Usuario]
        UC2[Editar Usuario]
        UC3[Eliminar Usuario]
        UC4[Cambiar Contraseña]
        UC5[Gestionar Permisos]
        UC6[Ver Perfil]
        UC7[Ver Historial]
    end

    subgraph "Sistema de Autenticación"
        UC8[Iniciar Sesión]
        UC9[Recuperar Contraseña]
        UC10[Cerrar Sesión]
    end

    A1 --> UC1
    A1 --> UC2
    A1 --> UC3
    A1 --> UC5
    A1 --> UC7
    A1 --> UC8
    A1 --> UC9
    A1 --> UC10

    A2 --> UC4
    A2 --> UC6
    A2 --> UC8
    A2 --> UC9
    A2 --> UC10

    A3 --> UC4
    A3 --> UC6
    A3 --> UC8
    A3 --> UC9
    A3 --> UC10

    classDef admin fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef user fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef aprendiz fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class A1 admin
    class A2 user
    class A3 aprendiz
```

---

### Diagrama 2: Sistema Agrícola y Producción

```mermaid
graph TD
    subgraph "Actores"
        A1[Administrador]
        A2[Agricultor]
    end

    subgraph "Gestión de Terrenos"
        UC1[Crear Lote]
        UC2[Editar Lote]
        UC3[Eliminar Lote]
        UC4[Ver Mapa de Lotes]
        UC5[Crear Surco]
        UC6[Gestionar Surcos]
        UC7[Configurar Coordenadas]
    end

    subgraph "Gestión de Cultivos"
        UC8[Crear Cultivo]
        UC9[Editar Cultivo]
        UC10[Monitorear Cultivo]
        UC11[Cambiar Estado]
        UC12[Asignar Tipos]
    end

    subgraph "Producción y Cosecha"
        UC13[Registrar Producción]
        UC14[Editar Producción]
        UC15[Control de Calidad]
        UC16[Historial de Rendimientos]
    end

    A1 --> UC1
    A1 --> UC2
    A1 --> UC3
    A1 --> UC4
    A1 --> UC5
    A1 --> UC6
    A1 --> UC7
    A1 --> UC8
    A1 --> UC9
    A1 --> UC10
    A1 --> UC11
    A1 --> UC12
    A1 --> UC13
    A1 --> UC14
    A1 --> UC15
    A1 --> UC16

    A2 --> UC1
    A2 --> UC2
    A2 --> UC4
    A2 --> UC5
    A2 --> UC6
    A2 --> UC7
    A2 --> UC8
    A2 --> UC9
    A2 --> UC10
    A2 --> UC11
    A2 --> UC12
    A2 --> UC13
    A2 --> UC14
    A2 --> UC15
    A2 --> UC16

    classDef admin fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef agricultor fill:#f3e5f5,stroke:#4a148c,stroke-width:2px

    class A1 admin
    class A2 agricultor
```

---

### Diagrama 3: Sistema IoT y Monitoreo

```mermaid
graph TD
    subgraph "Actores"
        A1[Administrador]
        A2[Agricultor]
        A3[Sistema IoT]
    end

    subgraph "Configuración IoT"
        UC1[Configurar Broker MQTT]
        UC2[Crear Subscripciones]
        UC3[Gestionar Tópicos]
        UC4[Configurar Conexiones]
    end

    subgraph "Gestión de Sensores"
        UC5[Crear Sensor]
        UC6[Editar Sensor]
        UC7[Eliminar Sensor]
        UC8[Configurar Alertas]
        UC9[Asignar Tipos]
    end

    subgraph "Monitoreo y Alertas"
        UC10[Monitorear Sensores]
        UC11[Recibir Alertas]
        UC12[Ver Datos en Tiempo Real]
        UC13[Ver Datos Históricos]
        UC14[Generar Reportes]
    end

    A1 --> UC1
    A1 --> UC2
    A1 --> UC3
    A1 --> UC4
    A1 --> UC5
    A1 --> UC6
    A1 --> UC7
    A1 --> UC8
    A1 --> UC9
    A1 --> UC10
    A1 --> UC11
    A1 --> UC12
    A1 --> UC13
    A1 --> UC14

    A2 --> UC5
    A2 --> UC6
    A2 --> UC8
    A2 --> UC10
    A2 --> UC11
    A2 --> UC12
    A2 --> UC13
    A2 --> UC14

    A3 --> UC10
    A3 --> UC11
    A3 --> UC12

    classDef admin fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef agricultor fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef iot fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px

    class A1 admin
    class A2 agricultor
    class A3 iot
```

---

### Diagrama 4: Inventario y Actividades

```mermaid
graph TD
    subgraph "Actores"
        A1[Administrador]
        A2[Agricultor]
        A3[Aprendiz]
    end

    subgraph "Gestión de Inventario"
        UC1[Crear Material]
        UC2[Editar Material]
        UC3[Eliminar Material]
        UC4[Ver Inventario]
        UC5[Control de Stock]
        UC6[Gestionar Categorías]
        UC7[Alertas de Stock]
    end

    subgraph "Sistema de Actividades"
        UC8[Crear Actividad]
        UC9[Asignar Actividad]
        UC10[Editar Actividad]
        UC11[Eliminar Actividad]
        UC12[Ver Historial]
    end

    subgraph "Evaluación y Aprendizaje"
        UC13[Enviar Respuesta]
        UC14[Calificar Respuesta]
        UC15[Ver Evaluaciones]
        UC16[Descargar Evidencia]
        UC17[Seguimiento de Progreso]
    end

    A1 --> UC1
    A1 --> UC2
    A1 --> UC3
    A1 --> UC4
    A1 --> UC5
    A1 --> UC6
    A1 --> UC7
    A1 --> UC8
    A1 --> UC9
    A1 --> UC10
    A1 --> UC11
    A1 --> UC12
    A1 --> UC13
    A1 --> UC14
    A1 --> UC15
    A1 --> UC16
    A1 --> UC17

    A2 --> UC1
    A2 --> UC2
    A2 --> UC4
    A2 --> UC5
    A2 --> UC6
    A2 --> UC7
    A2 --> UC8
    A2 --> UC9
    A2 --> UC10
    A2 --> UC12
    A2 --> UC13
    A2 --> UC15
    A2 --> UC16
    A2 --> UC17

    A3 --> UC13
    A3 --> UC15
    A3 --> UC16
    A3 --> UC17

    classDef admin fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef agricultor fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef aprendiz fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class A1 admin
    class A2 agricultor
    class A3 aprendiz
```

---

### Diagrama 5: Ventas, Finanzas y Fitosanitario

```mermaid
graph TD
    subgraph "Actores"
        A1[ Administrador]
        A2[ Agricultor]
    end

    subgraph "Sistema Comercial"
        UC1[Registrar Venta]
        UC2[Editar Venta]
        UC3[Eliminar Venta]
        UC4[Generar Factura]
        UC5[Ver Historial de Ventas]
        UC6[Control de Inventario]
    end

    subgraph "Gestión Financiera"
        UC7[Ver Reportes Financieros]
        UC8[Control de Gastos]
        UC9[Análisis de Costos]
        UC10[Presupuestos]
        UC11[Alertas Financieras]
    end

    subgraph "Salud de Cultivos"
        UC12[Diagnosticar EPA]
        UC13[Crear Tratamiento]
        UC14[Editar Tratamiento]
        UC15[Monitorear Tratamientos]
        UC16[Historial Fitosanitario]
        UC17[Alertas Sanitarias]
    end

    A1 --> UC1
    A1 --> UC2
    A1 --> UC3
    A1 --> UC4
    A1 --> UC5
    A1 --> UC6
    A1 --> UC7
    A1 --> UC8
    A1 --> UC9
    A1 --> UC10
    A1 --> UC11
    A1 --> UC12
    A1 --> UC13
    A1 --> UC14
    A1 --> UC15
    A1 --> UC16
    A1 --> UC17

    A2 --> UC1
    A2 --> UC2
    A2 --> UC4
    A2 --> UC5
    A2 --> UC6
    A2 --> UC7
    A2 --> UC8
    A2 --> UC9
    A2 --> UC10
    A2 --> UC11
    A2 --> UC12
    A2 --> UC13
    A2 --> UC14
    A2 --> UC15
    A2 --> UC16
    A2 --> UC17

    classDef admin fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef agricultor fill:#f3e5f5,stroke:#4a148c,stroke-width:2px

    class A1 admin
    class A2 agricultor
```


## Diagrama ER Detallado - Todas las Entidades

```mermaid
erDiagram
    %% Entidades principales
    Usuario {
        int id PK
        varchar tipo_identificacion
        varchar identificacion UK
        varchar nombre
        varchar apellidos
        varchar telefono
        varchar correo UK
        varchar password
        int tipo_usuario_id FK
        varchar id_ficha
        boolean estado
        datetime created_at
        datetime updated_at
    }

    Tipo_Usuario {
        int id PK
        varchar nombre
        varchar descripcion
        datetime created_at
    }

    Permiso {
        int id PK
        varchar nombre
        varchar descripcion
        datetime created_at
    }

    Usuario_Permisos {
        int id PK
        int usuario_id FK
        int permiso_id FK
        boolean estado
    }

    Ficha {
        int id PK
        varchar nombre
        varchar id_ficha UK
        datetime created_at
    }

    %% Entidades geográficas
    Lote {
        int id PK
        varchar nombre
        decimal area
        varchar estado
        json coordenadas
        int usuario_id FK
        datetime created_at
        datetime updated_at
    }

    Surco {
        int id PK
        varchar nombre
        varchar descripcion
        int lote_id FK
        int cultivo_id FK
        int broker_id FK
        boolean activo_mqtt
        varchar estado
        datetime created_at
        datetime updated_at
    }

    %% Entidades agrícolas
    Cultivo {
        int id PK
        varchar nombre
        int cantidad
        varchar img
        varchar descripcion
        int tipo_cultivo_id FK
        varchar estado
        date fecha_plantado
        int lote_id FK
        int surco_id FK
        int usuario_id FK
        datetime created_at
        datetime updated_at
    }

    Tipo_Cultivo {
        int id PK
        varchar nombre
        varchar descripcion
        datetime created_at
    }

    Produccione {
        int id PK
        int cantidad
        int cantidad_original
        date fecha
        varchar estado
        int cultivo_id FK
        datetime created_at
        datetime updated_at
    }

    %% Entidades comerciales
    Venta {
        int id PK
        varchar descripcion
        decimal monto
        date fecha
        int cantidad
        int produccion_id FK
        varchar tipo_movimiento
        varchar ruta_factura_pdf
        datetime created_at
    }

    Gastos_Produccion {
        int id PK
        varchar descripcion
        decimal monto
        date fecha
        int produccion_id FK
        int cultivo_id FK
        datetime created_at
    }

    %% Entidades de inventario
    Materiale {
        int id PK
        varchar nombre
        decimal cantidad
        decimal precio
        varchar descripcion
        varchar ubicacion
        varchar proveedor
        date fecha_vencimiento
        decimal peso_por_unidad
        boolean estado
        varchar tipo_categoria
        varchar tipo_material
        varchar medidas_de_contenido
        varchar tipo_empaque
        datetime created_at
        datetime updated_at
    }

    %% Entidades de actividades
    Actividade {
        int id PK
        varchar titulo
        varchar descripcion
        date fecha
        varchar img
        varchar estado
        int usuario_id FK
        int cultivo_id FK
        int horas
        decimal tarifa_hora
        datetime created_at
        datetime updated_at
    }

    Actividad_Materiale {
        int id PK
        int actividad_id FK
        int materiale_id FK
        decimal cantidad_usada
    }

    %% Entidades IoT
    Sensore {
        int id PK
        varchar nombre
        date fecha_instalacion
        decimal valor_minimo_alerta
        decimal valor_maximo_alerta
        varchar estado
        varchar topic
        int surco_id FK
        int tipo_sensor_id FK
        datetime created_at
        datetime updated_at
    }

    Tipo_Sensor {
        int id PK
        varchar nombre
        datetime created_at
    }

    Broker {
        int id PK
        varchar nombre
        varchar protocolo
        varchar host
        int puerto
        varchar usuario
        varchar password
        varchar prefijo_topicos
        json topicos_adicionales
        datetime created_at
    }

    Subscripcion {
        int id PK
        int broker_id FK
        varchar topic
        int qos
    }

    %% Entidades fitosanitarias
    Tratamiento {
        int id PK
        varchar descripcion
        date fecha_inicio
        date fecha_final
        varchar tipo
        varchar estado
        int cultivo_id FK
        datetime created_at
        datetime updated_at
    }

    Epa {
        int id PK
        date fecha_encuentro
        varchar nombre
        varchar descripcion
        varchar tipo_enfermedad
        varchar deficiencias
        varchar img
        varchar complicaciones
        datetime created_at
    }

    Cultivos_Epa {
        int id PK
        int cultivo_id FK
        int epa_id FK
    }

    Epa_Tratamiento {
        int id PK
        int tratamiento_id FK
        int epa_id FK
    }

    %% Relaciones
    Usuario ||--o{ Ficha : "tiene"
    Usuario ||--o{ Lote : "administra"
    Usuario ||--o{ Cultivo : "gestiona"
    Usuario ||--o{ Actividade : "realiza"
    Usuario }o--o{ Usuario_Permisos : "tiene"
    Usuario_Permisos }o--|| Permiso : "accede"

    Tipo_Usuario ||--o{ Usuario : "clasifica"

    Lote ||--o{ Surco : "contiene"
    Lote ||--o{ Cultivo : "alberga"

    Surco ||--o{ Sensore : "monitorea"
    Surco ||--o{ Cultivo : "tiene"
    Surco }o--o{ Broker : "conecta"

    Cultivo ||--o{ Produccione : "produce"
    Cultivo ||--o{ Actividade : "asociada"
    Cultivo ||--o{ Tratamiento : "recibe"
    Cultivo }o--o{ Cultivos_Epa : "relacionada"

    Tipo_Cultivo ||--o{ Cultivo : "define"

    Produccione ||--o{ Venta : "vende"
    Produccione ||--o{ Gastos_Produccion : "tiene"

    Materiale ||--o{ Actividad_Materiale : "usado en"
    Actividade ||--o{ Actividad_Materiale : "consume"

    Sensore }o--|| Tipo_Sensor : "clasifica"

    Broker ||--o{ Subscripcion : "tiene"

    Tratamiento ||--o{ Epa_Tratamiento : "aplica"
    Epa ||--o{ Epa_Tratamiento : "tratada"
    Epa ||--o{ Cultivos_Epa : "afecta"
```

### Descripción Completa del Diagrama ER

#### **Entidades y Atributos Principales:**

**Usuarios y Seguridad:**
- `Usuario`: Información personal, credenciales, rol
- `TipoUsuario`: Roles (Admin, Agricultor, Instructor, Aprendiz)
- `Permiso`: Accesos específicos del sistema
- `UsuarioPermiso`: Relación muchos-muchos usuarios-permisos
- `RolPermiso`: Relación muchos-muchos roles-permisos
- `Modulo`: Agrupaciones de permisos
- `Ficha`: Información académica

**Geografía Agrícola:**
- `Lote`: Áreas de terreno con coordenadas GPS
- `Sublote`: Subdivisiones dentro de lotes
- `Cultivo`: Plantaciones específicas
- `TipoCultivo`: Catálogo de tipos de cultivos

**Producción y Ventas:**
- `Produccion`: Cosechas y rendimientos
- `Venta`: Transacciones comerciales
- `Gasto`: Costos asociados

**Inventario:**
- `Material`: Insumos agrícolas con categorías
- `Movimiento`: Registro de entradas y salidas de inventario

**Actividades:**
- `Actividad`: Trabajos realizados
- `ActividadMaterial`: Consumo de materiales
- `ActividadUsuario`: Asignación de actividades
- `RespuestaActividad`: Respuestas de usuarios
- `Pago`: Pagos por actividades

**IoT:**
- `Sensor`: Dispositivos de medición
- `TipoSensor`: Clasificación de sensores
- `InformacionSensor`: Datos históricos
- `Broker`: Servidores MQTT
- `BrokerLote`: Conexiones broker-lote
- `Subscripcion`: Tópicos suscritos

**Fitosanitario:**
- `Tratamiento`: Soluciones aplicadas
- `Epa`: Problemas detectados
- `CultivoEpa`: Relaciones cultivo-problema
- `EpaTratamiento`: Tratamientos aplicados

#### **Relaciones Clave:**
- **Jerarquía Espacial**: Usuario → Lote → Sublote → Cultivo
- **Ciclo Productivo**: Cultivo → Produccion → Venta
- **Control de Acceso**: Usuario → TipoUsuario → RolPermiso → Permiso
- **Monitoreo**: Sublote → Sensor → InformacionSensor, Lote → BrokerLote → Broker
- **Salud**: Cultivo → CultivoEpa → Epa → EpaTratamiento → Tratamiento
- **Consumo**: Actividad → ActividadMaterial → Material, Movimiento registra cambios
- **Aprendizaje**: Actividad → ActividadUsuario → RespuestaActividad → Pago

## Notas sobre la Arquitectura
- **Modularidad**: Cada módulo (actividades, materiales, etc.) sigue el patrón Controller-Service-Entity.
- **Seguridad**: Guards y estrategias JWT protegen rutas; permisos gestionan accesos.
- **IoT**: MQTT integra sensores en surcos para monitoreo en tiempo real.
- **Cache**: Redis acelera consultas frecuentes.
- Para más detalles, ver [DTOs y Validaciones](/dtos) y [Despliegue](/despliegue).