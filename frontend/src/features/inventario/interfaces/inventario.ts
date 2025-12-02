// --- 1. DEFINICIÓN DE NUEVOS TIPOS ---

export const TipoCategoria = {
  INSUMOS_AGRICOLAS: 'Insumos agrícolas',
  AGROQUIMICOS: 'Agroquímicos y fitosanitarios',
  RIEGO_Y_SUMINISTRO: 'Materiales de riego y suministro',
  HERRAMIENTAS_MANUALES: 'Herramientas manuales',
  MAQUINARIA_Y_EQUIPOS: 'Maquinaria y equipos',
  PROTECCION_Y_SEGURIDAD: 'Materiales de protección y seguridad',
  EMPAQUE_Y_ALMACENAMIENTO: 'Materiales de empaque / almacenamiento',
  OTROS: 'Otros materiales varios',
} as const;
export type TipoCategoria = typeof TipoCategoria[keyof typeof TipoCategoria];

export const TipoMaterial = {
  SEMILLA: 'Semilla',
  PLANTULA: 'Plántula',
  ABONO_ORGANICO: 'Abono orgánico',
  ABONO_QUIMICO: 'Abono químico',
  FERTILIZANTE: 'Fertilizante',
  ENMIENDA: 'Enmienda',
  COMPOST: 'Compost',
  SUSTRATO: 'Sustrato',
  HERBICIDA: 'Herbicida',
  INSECTICIDA: 'Insecticida',
  FUNGICIDA: 'Fungicida',
  BACTERICIDA: 'Bactericida',
  NEMATICIDA: 'Nematicida',
  REGULADOR_CRECIMIENTO: 'Regulador de crecimiento',
  ADHERENTE: 'Adherente / Surfactante',
  FERTIRRIGACION: 'Fertirrigación',
  AGUA: 'Agua',
  TUBERIA: 'Tubería',
  MANGUERA: 'Manguera',
  GOTERO: 'Gotero',
  ASPERSOR: 'Aspersor',
  TANQUE: 'Tanque',
  SACO: 'Saco',
  BOLSA: 'Bolsa',
  CAJA: 'Caja',
  ENVASE: 'Envase',
  BIDON: 'Bidón',
  TAMBO: 'Tambo',
  FRASCO: 'Frasco',
  CABLE: 'Cable',
  CLAVO: 'Clavo',
  TORNILLO: 'Tornillo',
  PINTURA: 'Pintura',
  MADERA: 'Madera',
  PLASTICO: 'Plástico',
  METAL: 'Metal',
  OTRO: 'Otro',
} as const;
export type TipoMaterial = typeof TipoMaterial[keyof typeof TipoMaterial];

export const MedidasDeContenido = {
  KILOGRAMO: 'kg',
  GRAMO: 'g',
  LIBRA: 'lb',
  MILIGRAMO: 'mg',
  LITRO: 'L',
  MILILITRO: 'ml',
  CENTIMETRO_CUBICO: 'cm³',
  METRO_CUBICO: 'm³',
  GALON: 'gal',
  ONZA_LIQUIDA: 'oz',
  UNIDAD: 'unidad',
} as const;
export type MedidaDeContenido = typeof MedidasDeContenido[keyof typeof MedidasDeContenido];

export const TipoEmpaque = {
  UNIDAD: 'Unidad',
  PAQUETE: 'Paquete',
  CAJA: 'Caja',
  BOTELLA: 'Botella',
  BOLSA: 'Bolsa',
  TARRO: 'Tarro',
  FRASCO: 'Frasco',
  ENVASE: 'Envase',
  SACO: 'Saco',
  BULTO: 'Bulto',
  ROLLO: 'Rollo',
  BIDON: 'Bidón',
  TAMBOR: 'Tambor',
} as const;
export type TipoEmpaque = typeof TipoEmpaque[keyof typeof TipoEmpaque];

// --- UNIDADES DE MEDIDA PARA CONVERSIONES ---
// Actualizado a abreviaturas estándar
export const UnidadMedida = {
  UNIDAD: 'Unidad',
  CAJA: 'Caja',
  PAQUETE: 'Paquete',
  SACO: 'Saco',
  BULTO: 'Bulto',
  ROLLO: 'Rollo',

  // Masa (Abreviaturas estándar)
  KILOGRAMO: 'kg',
  GRAMO: 'g',
  MILIGRAMO: 'mg',
  LIBRA: 'lb',

  // Volumen (Abreviaturas estándar)
  LITRO: 'l',
  MILILITRO: 'ml',
  CENTIMETRO_CUBICO: 'cm3',
} as const;
export type UnidadMedida = typeof UnidadMedida[keyof typeof UnidadMedida];

// --- 2. RELACIÓN LÓGICA ENTRE CATEGORÍAS Y MATERIALES ---
export const categoriasYMateriales: Record<TipoCategoria, TipoMaterial[]> = {
  [TipoCategoria.INSUMOS_AGRICOLAS]: [TipoMaterial.SEMILLA, TipoMaterial.PLANTULA, TipoMaterial.ABONO_ORGANICO, TipoMaterial.ABONO_QUIMICO, TipoMaterial.FERTILIZANTE, TipoMaterial.ENMIENDA, TipoMaterial.COMPOST, TipoMaterial.SUSTRATO],
  [TipoCategoria.AGROQUIMICOS]: [TipoMaterial.HERBICIDA, TipoMaterial.INSECTICIDA, TipoMaterial.FUNGICIDA, TipoMaterial.BACTERICIDA, TipoMaterial.NEMATICIDA, TipoMaterial.REGULADOR_CRECIMIENTO, TipoMaterial.ADHERENTE, TipoMaterial.FERTIRRIGACION],
  [TipoCategoria.RIEGO_Y_SUMINISTRO]: [TipoMaterial.AGUA, TipoMaterial.TUBERIA, TipoMaterial.MANGUERA, TipoMaterial.GOTERO, TipoMaterial.ASPERSOR, TipoMaterial.TANQUE],
  [TipoCategoria.EMPAQUE_Y_ALMACENAMIENTO]: [TipoMaterial.SACO, TipoMaterial.BOLSA, TipoMaterial.CAJA, TipoMaterial.ENVASE, TipoMaterial.BIDON, TipoMaterial.TAMBO, TipoMaterial.FRASCO],
  [TipoCategoria.OTROS]: [TipoMaterial.CABLE, TipoMaterial.CLAVO, TipoMaterial.TORNILLO, TipoMaterial.PINTURA, TipoMaterial.MADERA, TipoMaterial.PLASTICO, TipoMaterial.METAL, TipoMaterial.OTRO],
  [TipoCategoria.HERRAMIENTAS_MANUALES]: [],
  [TipoCategoria.MAQUINARIA_Y_EQUIPOS]: [],
  [TipoCategoria.PROTECCION_Y_SEGURIDAD]: [],
};


// --- 3. INTERFACES ACTUALIZADAS ---
export interface Material {
  id: number;
  nombre: string;
  cantidad: number;
  precio: number;
  descripcion: string;
  ubicacion: string | null;
  proveedor: string | null;
  fechaVencimiento: string | null;
  img: string | null;
  estado: boolean;
  tipoCategoria: TipoCategoria;
  tipoMaterial?: TipoMaterial;
  tipoEmpaque: TipoEmpaque;
  medidasDeContenido?: MedidaDeContenido;
  pesoPorUnidad?: number | null; // Para saber cuánto pesa un saco
  tipoConsumo?: 'consumible' | 'no_consumible';
  cantidadPorUnidad?: number;
  cantidadRestanteEnUnidadActual?: number;
  usosTotales?: number;
  usosActuales?: number;
  unidadBase?: UnidadMedida; // Unidad base para conversiones
}

export interface MaterialData {
  id?: number; // ✅ <-- AÑADE ESTA LÍNEA
  nombre: string;
  cantidad: number;
  tipoCategoria: TipoCategoria;
  tipoMaterial?: TipoMaterial;
  tipoEmpaque: TipoEmpaque;
  medidasDeContenido?: MedidaDeContenido;
  pesoPorUnidad?: number;
  precio?: number;
  descripcion?: string;
  ubicacion?: string | null;
  proveedor?: string | null;
  fechaVencimiento?: string | null;
  imageFile?: File | null;
  tipoConsumo?: string;
  cantidadPorUnidad?: number;
  usosTotales?: number;
}

// --- Interfaces para Movimientos ---
export interface UsuarioMovimiento {
  identificacion: number;
  nombre: string;
  apellidos: string;
}

export interface MaterialMovimiento {
  id: number;
  nombre: string;
  medidasDeContenido?: MedidaDeContenido;
  tipoEmpaque?: TipoEmpaque;
}

export interface MovimientoData {
  id: number;
  tipo: string;
  cantidad: number;
  descripcion: string;
  fecha: string;
  referencia?: string;
  material?: MaterialMovimiento;
  usuario?: UsuarioMovimiento;
}