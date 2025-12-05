// src/features/actividades/interfaces/actividades.ts

// El tipo de estado ampliado
export type EstadoActividad = 'pendiente' | 'en proceso' | 'enviado' | 'aprobado' | 'rechazado' | 'completado' | 'finalizado';


export interface MaterialUsado {
  materialId: number;
  cantidadUsada: number;
  unidadMedida?: string; // Unidad de medida seleccionada por el usuario
}
// Interfaz para un usuario simple, tal como viene en la relación
export interface UsuarioSimple {
   id: number;
   identificacion: number;
   nombre: string;
   apellidos: string;
   // Información de ficha para filtrado y agrupación
   ficha?: {
     id: number;
     nombre: string;
     id_ficha: string;
   };
   // Información del tipo de usuario
   tipoUsuario?: {
     id: number;
     nombre: string;
     descripcion: string;
   };
}

// Interfaz para un cultivo simple
export interface CultivoSimple {
   id: number;
   nombre: string;
   loteId?: number;
}

// Interfaz para un lote simple
export interface LoteSimple {
   id: number;
   nombre: string;
}

// Interfaz para un sublote simple
export interface SubloteSimple {
   id: number;
   nombre: string;
}

// 1. Interfaz principal de Actividad (lo que devuelve la API)
// Corregimos id_actividad a id
export interface Actividad {
  id: number;
  titulo: string;
  fecha: string; // formato ISO string
  descripcion?: string;
  img?: string;
  archivoInicial?: string; // JSON string de filenames para el archivo inicial
  estado: EstadoActividad;
  horas?: number;
  tarifaHora?: number;
  costoManoObra?: number;
  totalHoras?: number;
  promedioTarifa?: number;
  // Relaciones que vienen del backend
  usuario?: UsuarioSimple;
  cultivo?: CultivoSimple;
  lote?: LoteSimple;
  sublote?: SubloteSimple;
  responsable?: UsuarioSimple;
  actividadMaterial?: {
    cantidadUsada: number;
    unidadMedida?: string;
    material: {
      id: number;
      nombre: string;
    };
  }[];
  respuestas?: RespuestaActividad[];
  asignados?: string; // JSON string con nombres de asignados
}

// 2. Payload para CREAR una actividad (lo que se envía a la API)
export interface CreateActividadPayload {
  titulo: string;
  fecha: string; // formato YYYY-MM-DD
  descripcion?: string;
  // El backend espera la IDENTIFICACIÓN del usuario, no su ID.
  usuario: number; // <--- ID de IDENTIFICACIÓN del usuario
  cultivo: number; // <--- ID del cultivo
  materiales?: MaterialUsado[];
}

// 3. Payload para ACTUALIZAR una actividad
// Hacemos opcionales todos los campos de la creación
export interface UpdateActividadPayload extends Partial<CreateActividadPayload> {
  estado?: EstadoActividad;
}

// 4. Payload para ENVIAR RESPUESTA
export interface SubmitRespuestaPayload {
  respuestaTexto?: string;
  respuestaArchivos?: string; // JSON string
}

// 5. Payload para ENVIAR RESPUESTA
export interface EnviarRespuestaPayload {
  descripcion?: string;
  archivos?: string; // JSON string
}

// 6. Payload para CALIFICAR ACTIVIDAD
export interface CalificarActividadPayload {
  calificacion: 'aprobado' | 'rechazado';
  comentarioInstructor?: string;
}

// 7. Interfaz para RespuestaActividad
export interface RespuestaActividad {
   id: number;
   descripcion?: string;
   archivos?: string;
   fechaEnvio: string;
   estado: 'pendiente' | 'aprobado' | 'rechazado';
   comentarioInstructor?: string;
   usuario: UsuarioSimple;
   esPasante?: boolean; // Campo adicional retornado por el backend al calificar
}
// Refleja AsignarActividadDto del backend
export interface AsignarActividadPayload {
   cultivo: number;        // ID del cultivo
   lote?: number;          // ID del lote (opcional)
   sublote?: number;       // ID del sublote (opcional)
   titulo: string;         // Título de la actividad
   descripcion: string;    // Descripción de la actividad
   fecha: string;          // Fecha de la actividad (YYYY-MM-DD)
   // Array de IDENTIFICACIONES de los aprendices seleccionados
   aprendices: number[];
   responsable?: number;   // ID del usuario responsable (opcional)
   materiales?: MaterialUsado[];
   archivoInicial?: string; // JSON string de filenames para el archivo inicial
}