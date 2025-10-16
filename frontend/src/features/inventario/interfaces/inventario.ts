// --- 1. SE CAMBIA 'enum' POR UN OBJETO CON 'as const' ---
export const TipoMaterial = {
  SEMILLA: 'Semilla',
  PLANTULA: 'Plántula',
  ABONO_ORGANICO: 'Abono orgánico',
  ABONO_QUIMICO: 'Abono químico',
  FERTILIZANTE: 'Fertilizante',
  SUSTRATO: 'Sustrato',
  HERBICIDA: 'Herbicida',
  INSECTICIDA: 'Insecticida',
  FUNGICIDA: 'Fungicida',
  PALA: 'Pala',
  RASTRILLO: 'Rastrillo',
  TIJERA_PODA: 'Tijera de poda',
  GUANTES: 'Guantes',
  BOTAS: 'Botas',
  SACO: 'Saco',
  BOLSA: 'Bolsa',
  CAJA: 'Caja',
  OTRO: 'Otro',
} as const;

// --- 2. SE CREA EL TIPO A PARTIR DEL OBJETO ---
export type TipoMaterial = typeof TipoMaterial[keyof typeof TipoMaterial];

// Este ya estaba bien
export const UnidadesDeMedida = {
  UNIDAD: 'Unidad', // ✅
  CAJA: 'Caja',
  PAQUETE: 'Paquete',
  SACO: 'Saco',
  BULTO: 'Bulto',
  ROLLO: 'Rollo',
  GRAMO: 'Gramo',
  KILOGRAMO: 'Kilogramo',
  LIBRA: 'Libra',
  MILILITRO: 'Mililitro',
  LITRO: 'Litro',
} as const;

export type UnidadMedida = typeof UnidadesDeMedida[keyof typeof UnidadesDeMedida];

// Las interfaces no necesitan cambios, ya que ahora usan los nuevos tipos
export interface Material {
  id: number;
  nombre: string;
  precio: number;
  descripcion: string;
  tipoMaterial: TipoMaterial;
  tipoMedida: UnidadMedida;
  cantidad: number;
  pesoPorUnidad: number | null;
  img: string | null;
  ubicacion: string | null;
  proveedor: string | null;
  fechaVencimiento: string | null;
}

export interface MaterialData {
  nombre: string;
  tipoMaterial: TipoMaterial;
  tipoMedida: UnidadMedida;
  cantidad: number;
  pesoPorUnidad?: number;
  precio?: number;
  descripcion?: string;
  ubicacion?: string | null;
  proveedor?: string | null;
  fechaVencimiento?: string | null;
  imageFile?: File | null;
}

export interface Movimiento {
    id: number;
    cantidad: number;
    tipo: 'Entrada' | 'Salida';
    fecha: string;
    descripcion: string;
    usuario: {
        nombre: string;
        apellidos: string;
    };
    material: {
        id: number;
        nombre: string;
    };
    actividad?: {
        id: number;
        titulo: string;
    } | null;
}

export interface MovimientoData {
    materialId: number;
    tipo: 'Entrada' | 'Salida';
    cantidad: number;
    descripcion?: string;
    actividadId?: number;
}