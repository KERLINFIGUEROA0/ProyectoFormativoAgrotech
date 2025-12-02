import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, DollarSign, PackageCheck, PackageX, Receipt, AlertCircle } from 'lucide-react';

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
        }));
      });
    } else {
      setItems([]);
    }
  }, [materiales]); // Dependencia correcta

  // 2. NOTIFICAR AL PADRE
  useEffect(() => {
    if (items.length > 0) {
      const payload = items.map(item => ({
        materialId: item.materialId,
        cantidadDevuelta: Number(item.cantidadDevuelta) || 0,
        cantidadDanada: item.reportarDano ? Number(item.cantidadDanada) || 0 : 0
      }));
      onChange(payload);
    }
  }, [items, onChange]);

  // 3. CALCULAR RESUMEN DE TRANSACCIÓN (COSTOS)
  const resumenCostos = useMemo(() => {
    return items
      .map(item => {
        const mat = materiales.find(m => m.materialId === item.materialId);
        if (!mat || !item.reportarDano) return null;

        const cantDanada = Number(item.cantidadDanada) || 0;
        if (cantDanada <= 0) return null;

        return {
          id: mat.materialId,
          nombre: mat.nombre,
          cantidad: cantDanada,
          precio: mat.precioUnitario,
          total: cantDanada * mat.precioUnitario
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
        // Cálculos seguros convirtiendo a número para la vista
        const valDevuelta = Number(itemState.cantidadDevuelta) || 0;
        const valDanada = Number(itemState.cantidadDanada) || 0;

        // Validación: Consumibles solo validan lo devuelto. Herramientas validan la suma.
        const totalIngresado = valDevuelta + (itemState.reportarDano ? valDanada : 0);
        const esExceso = totalIngresado > mat.cantidadAsignada;
        const costoEstimado = valDanada * mat.precioUnitario;

        // ¿Es herramienta/equipo? (No consumible)
        const esHerramienta = mat.tipoConsumo === 'no_consumible';

        return (
          <div key={mat.materialId} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            {/* Encabezado del Material */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-gray-800">{mat.nombre}</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  mat.tipoConsumo === 'no_consumible' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {mat.tipoConsumo === 'no_consumible' ? 'Herramienta / Equipo' : 'Insumo Consumible'}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-sm text-gray-500">Asignado:</span>
                <span className="font-mono font-bold text-lg">{mat.cantidadAsignada} {mat.unidad}</span>
              </div>
            </div>

            <div className={`grid ${esHerramienta ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>

              {/* COLUMNA 1: Devolución (Sobrantes o Herramientas buenas) */}
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1 flex items-center gap-1">
                  <PackageCheck size={16} />
                  {esHerramienta ? 'Devolver Buen Estado' : 'Devolver Sobrante (Resto al Stock)'}
                </label>
                <input
                  type="text" // Usamos text temporalmente para permitir "1." mientras escribes
                  inputMode="decimal"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 px-3 py-2"
                  value={itemState.cantidadDevuelta}
                  onChange={(e) => {
                    // Validamos que sea un número o vacío para no romper el input
                    if (/^\d*\.?\d*$/.test(e.target.value)) {
                      handleUpdate(index, 'cantidadDevuelta', e.target.value);
                    }
                  }}
                  placeholder="0"
                />
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
                      <label className="block text-sm font-medium text-red-700 mb-1 flex items-center gap-1">
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
              <div className="mt-2 flex items-center gap-2 text-red-600 text-sm font-medium bg-red-50 p-2 rounded">
                <AlertTriangle size={16} />
                ¡Error! La suma de devueltos y dañados ({totalIngresado}) supera lo asignado ({mat.cantidadAsignada}).
              </div>
            )}
             {!esExceso && totalIngresado < mat.cantidadAsignada && (
              <div className="mt-2 text-amber-600 text-sm bg-amber-50 p-2 rounded">
                Nota: Faltan {mat.cantidadAsignada - totalIngresado} unidades por justificar.
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

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 bg-white">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Cant. Dañada</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Valor Unit.</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumenCostos.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-sm text-slate-700 font-medium">{item.nombre}</td>
                    <td className="px-4 py-2 text-sm text-right text-red-600 font-bold">{item.cantidad}</td>
                    <td className="px-4 py-2 text-sm text-right text-slate-500">${item.precio.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-right text-slate-800 font-bold">${item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-slate-700">Total a Cargo del Cultivo:</td>
                  <td className="px-4 py-3 text-right text-lg font-black text-red-600">
                    ${granTotalCosto.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-slate-500 mt-3 text-center">
            * Se generará automáticamente un registro de <strong>Egreso</strong> en Transacciones por este valor.
          </p>
        </div>
      )}
    </div>
  );
};