import { UnidadMedida } from '../features/inventario/interfaces/inventario';

// FACTORES DE CONVERSIÓN (BASE = 1)
// NUEVA BASE: 1 = Gramo (g) o Mililitro (ml)
// Deben coincidir con el Backend para que la matemática sea exacta
export const FACTORES_CONVERSION: Record<string, number> = {
  // MASA (Base: g)
  [UnidadMedida.KILOGRAMO]: 1000,     // 1 kg = 1000 g
  [UnidadMedida.GRAMO]: 1,            // Base
  [UnidadMedida.MILIGRAMO]: 0.001,    // 1 mg = 0.001 g

  // VOLUMEN (Base: ml)
  [UnidadMedida.LITRO]: 1000,         // 1 L = 1000 ml
  [UnidadMedida.MILILITRO]: 1,        // Base
  [UnidadMedida.CENTIMETRO_CUBICO]: 1,// 1 cm3 = 1 ml

  // EMPAQUES (Base 1, se calculan por pesoPorUnidad en otro lado)
  [UnidadMedida.UNIDAD]: 1,
  [UnidadMedida.SACO]: 1,
  [UnidadMedida.CAJA]: 1,
  [UnidadMedida.BULTO]: 1,
  [UnidadMedida.PAQUETE]: 1,
  [UnidadMedida.ROLLO]: 1,
};

// Unidades de masa disponibles
export const UNIDADES_MASA = [
  UnidadMedida.KILOGRAMO,
  UnidadMedida.GRAMO,
  UnidadMedida.MILIGRAMO,
];

// Unidades de volumen disponibles
export const UNIDADES_VOLUMEN = [
  UnidadMedida.LITRO,
  UnidadMedida.MILILITRO,
  UnidadMedida.CENTIMETRO_CUBICO,
];

// Unidades de empaque disponibles
export const UNIDADES_EMPAQUE = [
  UnidadMedida.UNIDAD,
  UnidadMedida.SACO,
  UnidadMedida.CAJA,
  UnidadMedida.BULTO,
  UnidadMedida.PAQUETE,
  UnidadMedida.ROLLO,
];

// Determina si una unidad es de masa
export const esUnidadMasa = (unidad: string): boolean => {
  return UNIDADES_MASA.includes(unidad as typeof UNIDADES_MASA[number]);
};

// Determina si una unidad es de volumen
export const esUnidadVolumen = (unidad: string): boolean => {
  return UNIDADES_VOLUMEN.includes(unidad as typeof UNIDADES_VOLUMEN[number]);
};

// Determina si una unidad es de empaque
export const esUnidadEmpaque = (unidad: string): boolean => {
  return UNIDADES_EMPAQUE.includes(unidad as typeof UNIDADES_EMPAQUE[number]);
};

// Obtiene las unidades disponibles para un tipo de material
export const obtenerUnidadesDisponibles = (
  tipoConsumo: 'consumible' | 'no_consumible',
  medidasDeContenido?: string
): UnidadMedida[] => {
  if (tipoConsumo === 'no_consumible') {
    return UNIDADES_EMPAQUE;
  }

  // Para consumibles, mostrar unidades según el tipo de contenido
  if (medidasDeContenido) {
    if (esUnidadMasa(medidasDeContenido)) {
      return UNIDADES_MASA;
    }
    if (esUnidadVolumen(medidasDeContenido)) {
      return UNIDADES_VOLUMEN;
    }
  }

  // Default: mostrar todas las unidades convertibles
  return [
    UnidadMedida.KILOGRAMO,
    UnidadMedida.GRAMO,
    UnidadMedida.MILIGRAMO, // Aseguramos que salga en la lista
    UnidadMedida.LITRO,
    UnidadMedida.MILILITRO
  ];
};

// --- FUNCIÓN PARA CONVERTIR STOCK A LA UNIDAD SELECCIONADA ---
export const convertirStockAUnidad = (cantidadBase: number, unidadDestino: string): number => {
  const factor = FACTORES_CONVERSION[unidadDestino];
  if (!factor) return cantidadBase;

  // Ejemplo: Tengo 0.015g (15mg). Quiero ver mg (factor 0.001).
  // 0.015 / 0.001 = 15. Correcto.
  return cantidadBase / factor;
};

// --- ✅ NUEVA FUNCIÓN: FORMATO INTELIGENTE ---
export const formatearCantidadInteligente = (cantidadBase: number, unidadPreferida?: string): { cantidad: number, unidad: string } => {
    // 1. Identificar si es MASA o VOLUMEN basado en la unidad preferida del producto
    const esVolumen = unidadPreferida && (esUnidadVolumen(unidadPreferida) || unidadPreferida.toLowerCase() === 'l');

    // 2. Lógica para VOLUMEN (Base: ml)
    if (esVolumen) {
        if (cantidadBase >= 1000) {
            return { cantidad: cantidadBase / 1000, unidad: 'L' }; // Mostrar Litros
        }
        return { cantidad: cantidadBase, unidad: 'ml' }; // Mostrar Mililitros
    }

    // 3. Lógica para MASA (Base: g)
    // Por defecto asumimos masa si no es volumen
    if (cantidadBase >= 1000) {
        return { cantidad: cantidadBase / 1000, unidad: 'kg' }; // Mostrar Kilos
    }
    if (cantidadBase < 1 && cantidadBase > 0) {
        return { cantidad: cantidadBase * 1000, unidad: 'mg' }; // Mostrar Miligramos
    }

    return { cantidad: cantidadBase, unidad: 'g' }; // Mostrar Gramos
};