import { UnidadMedida } from '../enums/unidad-medida.enum';
import { MedidasDeContenido } from '../enums/unidad-contenido.enum';

export class UnitConversionUtil {
  // Mapeo entre MedidasDeContenido y UnidadMedida
  private static readonly mapeoMedidasAUnidad = {
    [MedidasDeContenido.KILOGRAMO]: UnidadMedida.KILOGRAMO,
    [MedidasDeContenido.GRAMO]: UnidadMedida.GRAMO,
    [MedidasDeContenido.LIBRA]: UnidadMedida.LIBRA,
    [MedidasDeContenido.MILIGRAMO]: UnidadMedida.MILIGRAMO,
    [MedidasDeContenido.LITRO]: UnidadMedida.LITRO,
    [MedidasDeContenido.MILILITRO]: UnidadMedida.MILILITRO,
    [MedidasDeContenido.CENTIMETRO_CUBICO]: UnidadMedida.CENTIMETRO_CUBICO,
    [MedidasDeContenido.UNIDAD]: UnidadMedida.UNIDAD,
  };

  // Tabla de factores de conversión a la UNIDAD BASE
  // Masa: GRAMO, Volumen: MILILITRO
  private static readonly factoresConversion = {
    // MASA (Base: GRAMO = 1)
    [UnidadMedida.KILOGRAMO]: 1000,      // 1kg = 1000g
    [UnidadMedida.GRAMO]: 1,             // 1g = 1g
    [UnidadMedida.MILIGRAMO]: 0.001,     // 1000mg = 1g
    [UnidadMedida.LIBRA]: 453.592,       // 1lb ≈ 453.592g

    // VOLUMEN (Base: MILILITRO = 1)
    [UnidadMedida.LITRO]: 1000,          // 1L = 1000ml
    [UnidadMedida.MILILITRO]: 1,         // 1ml = 1ml
    [UnidadMedida.CENTIMETRO_CUBICO]: 1, // 1cm³ = 1ml

    // Unidades de empaque (no convertibles, mantienen valor 1:1)
    [UnidadMedida.UNIDAD]: 1,
    [UnidadMedida.CAJA]: 1,
    [UnidadMedida.PAQUETE]: 1,
    [UnidadMedida.SACO]: 1,
    [UnidadMedida.BULTO]: 1,
    [UnidadMedida.ROLLO]: 1,
  };

  /**
   * Determina si una unidad es de masa
   */
  static esUnidadMasa(unidad: UnidadMedida): boolean {
    return [
      UnidadMedida.KILOGRAMO,
      UnidadMedida.GRAMO,
      UnidadMedida.MILIGRAMO,
      UnidadMedida.LIBRA
    ].includes(unidad);
  }

  /**
   * Determina si una unidad es de volumen
   */
  static esUnidadVolumen(unidad: UnidadMedida): boolean {
    return [
      UnidadMedida.LITRO,
      UnidadMedida.MILILITRO,
      UnidadMedida.CENTIMETRO_CUBICO
    ].includes(unidad);
  }

  /**
   * Determina si una unidad es de empaque (no convertible)
   */
  static esUnidadEmpaque(unidad: string): boolean {
    return [
      UnidadMedida.UNIDAD,
      UnidadMedida.CAJA,
      UnidadMedida.PAQUETE,
      UnidadMedida.SACO,
      UnidadMedida.BULTO,
      UnidadMedida.ROLLO
    ].includes(unidad as UnidadMedida);
  }

  /**
   * Convierte una cantidad de una unidad específica a la unidad base
   * @param cantidad Cantidad a convertir
   * @param unidad Unidad de origen
   * @returns Cantidad en unidad base (g o ml)
   */
  static convertirABase(cantidad: number, unidad: UnidadMedida): number {
    const factor = this.factoresConversion[unidad];

    // Debug logging to identify conversion issues
    console.log(`🔄 Conversión: ${cantidad} ${unidad} -> factor: ${factor}`);

    if (factor === undefined) {
      console.error(`❌ Error crítico: Unidad '${unidad}' no tiene factor de conversión.`);
      // Fallback seguro: si es mg y no está en el mapa por alguna razón extraña
      if (unidad === UnidadMedida.MILIGRAMO) return cantidad * 0.001;
      throw new Error(`Unidad de medida ${unidad} no soportada o mal escrita.`);
    }

    const resultado = cantidad * factor;
    console.log(`✅ Resultado: ${cantidad} * ${factor} = ${resultado}`);

    return resultado;
  }

  /**
   * Convierte una cantidad de la unidad base a una unidad específica
   * @param cantidadBase Cantidad en unidad base
   * @param unidad Unidad destino
   * @returns Cantidad en la unidad destino
   */
  static convertirDesdeBase(cantidadBase: number, unidad: UnidadMedida): number {
    const factor = this.factoresConversion[unidad];
    if (!factor) {
      throw new Error(`Unidad de medida ${unidad} no soportada`);
    }
    return cantidadBase / factor;
  }

  /**
   * Obtiene la unidad base para un tipo de material
   * @param tipoConsumo Tipo de consumo del material
   * @returns Unidad base (GRAMO o MILILITRO)
   */
  static obtenerUnidadBase(tipoConsumo: 'consumible' | 'no_consumible', medidasDeContenido?: MedidasDeContenido): UnidadMedida {
    if (tipoConsumo === 'no_consumible') {
      return UnidadMedida.UNIDAD;
    }

    // Para consumibles, determinar por medidas de contenido
    if (medidasDeContenido) {
      const unidadMapeada = this.mapeoMedidasAUnidad[medidasDeContenido];
      if (unidadMapeada) {
        if (this.esUnidadMasa(unidadMapeada)) {
          return UnidadMedida.GRAMO;
        }
        if (this.esUnidadVolumen(unidadMapeada)) {
          return UnidadMedida.MILILITRO;
        }
      }
    }

    // Default para consumibles sin especificar
    return UnidadMedida.GRAMO;
  }

  /**
   * Obtiene las unidades disponibles para un tipo de material
   * @param tipoConsumo Tipo de consumo
   * @param medidasDeContenido Medidas de contenido actuales
   * @returns Array de unidades disponibles
   */
  static obtenerUnidadesDisponibles(tipoConsumo: 'consumible' | 'no_consumible', medidasDeContenido?: MedidasDeContenido): UnidadMedida[] {
    if (tipoConsumo === 'no_consumible') {
      return [
        UnidadMedida.UNIDAD,
        UnidadMedida.CAJA,
        UnidadMedida.PAQUETE,
        UnidadMedida.SACO,
        UnidadMedida.BULTO,
        UnidadMedida.ROLLO
      ];
    }

    // Para consumibles, mostrar unidades según el tipo de contenido
    if (medidasDeContenido) {
      const unidadMapeada = this.mapeoMedidasAUnidad[medidasDeContenido];
      if (unidadMapeada) {
        if (this.esUnidadMasa(unidadMapeada)) {
          return [
            UnidadMedida.KILOGRAMO,
            UnidadMedida.GRAMO,
            UnidadMedida.MILIGRAMO,
            UnidadMedida.LIBRA
          ];
        }
        if (this.esUnidadVolumen(unidadMapeada)) {
          return [
            UnidadMedida.LITRO,
            UnidadMedida.MILILITRO,
            UnidadMedida.CENTIMETRO_CUBICO
          ];
        }
      }
    }

    // Default: mostrar todas las unidades convertibles
    return [
      UnidadMedida.KILOGRAMO,
      UnidadMedida.GRAMO,
      UnidadMedida.LIBRA,
      UnidadMedida.LITRO,
      UnidadMedida.MILILITRO
    ];
  }
}