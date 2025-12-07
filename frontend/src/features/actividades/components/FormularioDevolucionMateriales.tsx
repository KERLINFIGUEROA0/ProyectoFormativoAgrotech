import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, DollarSign, PackageCheck, PackageX, Receipt, Ruler } from 'lucide-react';
import { UNIDADES_VOLUMEN, UNIDADES_MASA, FACTORES_CONVERSION, esUnidadVolumen, esUnidadMasa } from '../../../utils/unitConversion';

interface MaterialAsignado {
  materialId: number;
  nombre: string;
  cantidadAsignada: number;
  precioUnitario: number;
  unidad: string;
  tipoConsumo: string; // 'consumible' | 'no_consumible'
}

// CAMBIO 1: Permitimos string temporalmente para facilitar la escritura en inputs
interface DevolucionItem {
  materialId: number;
  cantidadDevuelta: number | string; // Permitimos string para escritura fluida
  cantidadDanada: number | string;
  reportarDano: boolean;
  unidadSeleccionada: string; // Nueva: La unidad que el usuario elige en el form
}

interface Props {
  materiales: MaterialAsignado[];
  onChange: (datos: any[]) => void; // Para enviar datos al padre
}

export const FormularioDevolucionMateriales: React.FC<Props> = ({ materiales, onChange }) => {
  const [items, setItems] = useState<DevolucionItem[]>([]);

  // CAMBIO 2: Inicialización protegida.
  // Solo inicializamos si la cantidad de items no coincide, evitando reinicios innecesarios.
  useEffect(() => {
    if (materiales && materiales.length > 0) {
      setItems((prevItems) => {
        // Si ya tenemos items cargados y coinciden en cantidad, no reiniciamos para no perder lo escrito
        if (prevItems.length === materiales.length) {
          return prevItems;
        }

        return materiales.map((m) => ({
          materialId: m.materialId,
          cantidadDevuelta: '', // Empezar vacío es más limpio para el usuario
          cantidadDanada: '',
          reportarDano: false,
          unidadSeleccionada: m.unidad || 'Unidad', // Por defecto seleccionamos la unidad original de la asignación
        }));
      });
    } else {
      setItems([]);
    }
  }, [materiales]); // Dependencia correcta

  // 2. NOTIFICAR AL PADRE (CORREGIDO: Sin conversión, enviamos datos puros)
  useEffect(() => {
    if (items.length > 0) {
      const payload = items.map((item) => {
        const valDevueltaUsuario = Number(item.cantidadDevuelta) || 0;
        const valDanadaUsuario = item.reportarDano ? (Number(item.cantidadDanada) || 0) : 0;

        // 🔍 DEBUG FRONTEND: ¿Qué estamos enviando realmente?
        console.group(`📦 [FRONT] Item Material ID: ${item.materialId}`);
        console.log(`   Valor escrito por usuario: ${item.cantidadDevuelta}`);
        console.log(`   Valor numérico procesado: ${valDevueltaUsuario}`);
        console.log(`   Unidad Seleccionada (Estado): "${item.unidadSeleccionada}"`);
        console.groupEnd();

        // 🔥 CAMBIO CRÍTICO:
        // Ya no convertimos aquí. Enviamos exactamente lo que escribió el usuario
        // y la unidad que seleccionó. El backend se encarga del resto.
        return {
          materialId: item.materialId,
          cantidadDevuelta: valDevueltaUsuario,
          cantidadDanada: valDanadaUsuario,
          unidadSeleccionada: item.unidadSeleccionada // Importante para que el backend sepa qué cálculo hacer
        };
      });

      console.log('🚀 [FRONT] Payload completo enviado al padre:', payload);
      onChange(payload);
    }
  }, [items, onChange]);

  // 3. CALCULAR RESUMEN DE TRANSACCIÓN (COSTOS)
  const resumenCostos = useMemo(() => {
    return items
      .map((item, index) => {
        const mat = materiales[index];
        if (!mat) return null;

        const valDevueltaUsuario = Number(item.cantidadDevuelta) || 0;
        const valDanadaUsuario = Number(item.cantidadDanada) || 0;

        let cantidadCobrar = 0;
        let precioTotal = 0;
        let concepto = '';

        // --- CASO A: HERRAMIENTAS (Solo cobramos si las dañan) ---
        if (mat.tipoConsumo === 'no_consumible') {
            if (!item.reportarDano || valDanadaUsuario <= 0) return null;

            cantidadCobrar = valDanadaUsuario;
            precioTotal = cantidadCobrar * mat.precioUnitario;
            concepto = 'Daño/Pérdida';
        }
        // --- CASO B: INSUMOS (Cobramos lo que se gastó) ---
        // Aquí aplicamos la lógica: Asignado (10) - Devuelto (5) = Cobrar (5)
        else {
            // 1. Convertir lo devuelto a la misma unidad que lo asignado (por si acaso)
            let devueltoNormalizado = valDevueltaUsuario;
            if (item.unidadSeleccionada !== mat.unidad) {
               const fSel = FACTORES_CONVERSION[item.unidadSeleccionada] || 1;
               const fOrig = FACTORES_CONVERSION[mat.unidad] || 1;
               devueltoNormalizado = valDevueltaUsuario * (fSel / fOrig);
            }

            // 2. Calcular consumo real
            const consumoReal = mat.cantidadAsignada - devueltoNormalizado;

            // Si el consumo es casi 0, no cobramos nada
            if (consumoReal <= 0.001) return null;

            cantidadCobrar = consumoReal;
            precioTotal = cantidadCobrar * mat.precioUnitario; // 5 * 1000 = 5000
            concepto = 'Consumo Real';
        }

        return {
          id: mat.materialId,
          nombre: mat.nombre,
          concepto: concepto,
          cantidad: cantidadCobrar,
          unidadVisual: mat.unidad,
          precio: mat.precioUnitario,
          total: precioTotal
        };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);
  }, [items, materiales]);

  const granTotalCosto = resumenCostos.reduce((acc, curr) => acc + curr.total, 0);

  const handleUpdate = (index: number, field: keyof DevolucionItem, value: any) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      if (newItems[index]) {
        newItems[index] = { ...newItems[index], [field]: value };
      }
      return newItems;
    });
  };

  const getOpcionesUnidad = (unidadOriginal: string) => {
    if (esUnidadVolumen(unidadOriginal)) return UNIDADES_VOLUMEN;
    if (esUnidadMasa(unidadOriginal)) return UNIDADES_MASA;
    return [unidadOriginal]; // Si es unidad/paquete, no mostramos conversión
  };

  // No renderizar hasta que el estado esté inicializado
  if (items.length === 0 && materiales.length > 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-500">Cargando formulario...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SECCIÓN 1: LISTADO DE MATERIALES */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
          <PackageCheck className="text-blue-600" />
          Reporte de Devolución
        </h3>

        {materiales.map((mat, index) => {
          const itemState = items[index];
          if (!itemState) return null; // Safety check

          const esHerramienta = mat.tipoConsumo === 'no_consumible';
          const opcionesUnidad = esHerramienta ? [] : getOpcionesUnidad(mat.unidad);
          const permiteConversion = opcionesUnidad.length > 1;

          // Cálculos para validación visual
          const valDevuelta = Number(itemState.cantidadDevuelta) || 0;
          const valDanada = Number(itemState.cantidadDanada) || 0;

          // Normalizamos a la unidad asignada para comparar con el límite
          let totalIngresadoEnAsignada = valDevuelta + (itemState.reportarDano ? valDanada : 0);
          if (permiteConversion) {
             const fSel = FACTORES_CONVERSION[itemState.unidadSeleccionada] || 1;
             const fOrig = FACTORES_CONVERSION[mat.unidad] || 1;
             totalIngresadoEnAsignada = totalIngresadoEnAsignada * (fSel / fOrig);
          }

          // Permitimos un margen de error mínimo por decimales (0.0001)
          const esExceso = totalIngresadoEnAsignada > (mat.cantidadAsignada + 0.0001);

          // Calcular costo estimado para daños
          const costoEstimado = itemState.reportarDano ? (valDanada * mat.precioUnitario) : 0;

        return (
          <div key={mat.materialId} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            {/* Encabezado del Material */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                  {mat.nombre}
                  {permiteConversion && (
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <Ruler size={12}/> {mat.unidad} (Asignado)
                    </span>
                  )}
                </h4>
                <span className={`text-xs px-2 py-1 rounded-full ${esHerramienta ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {esHerramienta ? 'Herramienta' : 'Insumo'}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-sm text-gray-500">Total Asignado</span>
                <span className="font-mono font-bold text-lg">{mat.cantidadAsignada} {mat.unidad}</span>
              </div>
            </div>

            <div className={`grid ${esHerramienta ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>

              {/* COLUMNA 1: Devolución (Sobrantes o Herramientas buenas) */}
              <div>
                <label className="text-sm font-medium text-green-700 mb-1 flex items-center gap-1">
                  <PackageCheck size={16} />
                  {esHerramienta ? 'Devolver Buen Estado' : 'Devolver Sobrante (Resto al Stock)'}
                </label>

                <div className="flex gap-2">
                  <input
                    type="text" // Usamos text temporalmente para permitir "1." mientras escribes
                    inputMode="decimal"
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 px-3 py-2"
                    value={itemState.cantidadDevuelta}
                    onChange={(e) => {
                      // Validamos que sea un número o vacío para no romper el input
                      if (/^\d*\.?\d*$/.test(e.target.value)) {
                        handleUpdate(index, 'cantidadDevuelta', e.target.value);
                      }
                    }}
                    placeholder="0"
                  />

                  {/* SELECTOR DE UNIDAD */}
                  {permiteConversion ? (
                    <select
                      className="w-24 border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 bg-gray-50 text-sm"
                      value={itemState.unidadSeleccionada}
                      onChange={(e) => handleUpdate(index, 'unidadSeleccionada', e.target.value)}
                    >
                      {opcionesUnidad.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  ) : (
                    <div className="px-3 py-2 bg-gray-100 text-gray-500 rounded-md border border-gray-200 text-sm font-medium">
                      {mat.unidad}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {esHerramienta
                    ? 'Cantidad que regresa al inventario funcional.'
                    : 'Cantidad de insumo que NO se gastó y vuelve a bodega.'}
                </p>
              </div>

              {/* COLUMNA 2: Daños - SOLO VISIBLE PARA HERRAMIENTAS (no_consumible) */}
              {esHerramienta && (
                <div className={`p-3 rounded-md border ${itemState.reportarDano ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-transparent'}`}>
                  <div className="flex items-center mb-2">
                    <input
                      id={`check-dano-${mat.materialId}`}
                      type="checkbox"
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                      checked={itemState.reportarDano}
                      onChange={(e) => handleUpdate(index, 'reportarDano', e.target.checked)}
                    />
                    <label htmlFor={`check-dano-${mat.materialId}`} className="ml-2 block text-sm font-medium text-gray-900 cursor-pointer">
                      Reportar Daño / Pérdida
                    </label>
                  </div>

                  {itemState.reportarDano && (
                    <div className="animate-fadeIn">
                      <label className="text-sm font-medium text-red-700 mb-1 flex items-center gap-1">
                        <PackageX size={16} />
                        Cantidad Dañada
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full border-red-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 px-3 py-2 mb-2"
                        value={itemState.cantidadDanada}
                        onChange={(e) => {
                          if (/^\d*\.?\d*$/.test(e.target.value)) {
                            handleUpdate(index, 'cantidadDanada', e.target.value);
                          }
                        }}
                        placeholder="0"
                      />

                      <div className="bg-white p-2 rounded border border-red-100 mt-2">
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>Costo Unitario:</span>
                          <span>${mat.precioUnitario.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-red-600 mt-1 border-t pt-1">
                          <span className="flex items-center gap-1"><DollarSign size={14}/> Cargo Total:</span>
                          <span>${costoEstimado.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Validaciones Visuales */}
            {esExceso && (
              <div className="mt-2 flex items-center gap-2 text-red-600 text-sm font-medium bg-red-50 p-2 rounded animate-pulse">
                <AlertTriangle size={16} />
                Estás devolviendo {totalIngresadoEnAsignada.toFixed(2)} {mat.unidad}, pero solo se asignaron {mat.cantidadAsignada}.
              </div>
            )}
          </div>
        );
      })}
      </div>

      {/* SECCIÓN 2: PREVISUALIZACIÓN DE TRANSACCIÓN FINANCIERA */}
      {granTotalCosto > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-inner">
          <h4 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Receipt className="text-slate-600" />
            Previsualización de Costos (Transacción a Generar)
          </h4>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 bg-white">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Concepto</th> {/* Nueva Columna */}
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Cant. Facturada</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Valor Unit.</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumenCostos.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-sm text-slate-700 font-medium">{item.nombre}</td>

                    {/* Columna Concepto: Diferencia visualmente Consumo de Daño */}
                    <td className="px-4 py-2 text-sm text-slate-600">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.concepto === 'Daño/Pérdida' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.concepto}
                        </span>
                    </td>

                    <td className="px-4 py-2 text-sm text-right text-slate-700 font-bold">
                      {/* Usamos toFixed(2) para que se vean bien los decimales de insumos */}
                      {item.cantidad.toFixed(2)} {item.unidadVisual}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-slate-500">${item.precio.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-right text-slate-800 font-bold">${item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-slate-700">Total Costo Real (Transacción):</td>
                  <td className="px-4 py-3 text-right text-lg font-black text-blue-800">
                    ${granTotalCosto.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};