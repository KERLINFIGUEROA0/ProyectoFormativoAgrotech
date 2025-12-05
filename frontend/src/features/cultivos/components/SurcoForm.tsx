import { useState, useEffect, type ReactElement } from 'react';
import { Button } from "@heroui/react";
import type { Lote, Cultivo, SurcoData } from '../interfaces/cultivos';
import type { Broker } from '../../iot/interfaces/iot';

// Un tipo para manejar los datos del formulario de manera interna.
// Hacemos todo parcial para manejar el estado inicial y la creación.
type SurcoFormData = Partial<{
  id: number;
  nombre: string;
  descripcion: string;
  loteId: number;
  cultivoId: number;
  brokerId: number | null;
}>;

interface SurcoFormProps {
  initialData?: SurcoFormData;
  lotes: Lote[];
  cultivos: Cultivo[];
  brokers: Broker[];
  onSave: (data: SurcoData) => void;
  onCancel: () => void;
}

export default function SurcoForm({ initialData = {}, lotes, cultivos, brokers, onSave, onCancel }: SurcoFormProps): ReactElement {
  const [formData, setFormData] = useState<SurcoFormData>({
    ...initialData,
    brokerId: initialData.brokerId ?? null,
  });

  const isEditing = Boolean(initialData && initialData.id);

  useEffect(() => {
    setFormData({
      ...initialData,
      brokerId: initialData.brokerId ?? null,
    });
  }, [initialData]);

  const handleSubmit = () => {
    // Preparamos los datos para enviar
    const dataToSave: SurcoData = {
      nombre: formData.nombre || '',
      descripcion: formData.descripcion || undefined,
      // Convertimos valores vacíos o null a undefined para que el backend los maneje correctamente
      cultivoId: formData.cultivoId && formData.cultivoId > 0 ? formData.cultivoId : undefined,
      brokerId: formData.brokerId && formData.brokerId > 0 ? formData.brokerId : undefined,
    };
    
    // Solo agregamos loteId si no estamos editando
    if (!isEditing && formData.loteId) {
      dataToSave.loteId = formData.loteId;
    }
    
    onSave(dataToSave);
  };

  const loteActualNombre = isEditing 
    ? lotes.find(l => l.id === formData.loteId)?.nombre || 'No disponible' 
    : '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Nombre del Surco</span>
        <input
          name="nombre"
          value={formData.nombre || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
          placeholder="Ej: A-01"
          className="border border-gray-300 rounded-md p-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Descripción (Opcional)</span>
        <textarea
          name="descripcion"
          value={formData.descripcion || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
          placeholder="Añada detalles sobre el surco..."
          className="border border-gray-300 rounded-md p-2 h-24"
        />
      </label>

      {isEditing ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Lote Asignado</span>
          <input
            type="text"
            value={loteActualNombre}
            disabled
            className="border border-gray-200 rounded-md p-2 bg-gray-100 cursor-not-allowed"
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Lote Asignado</span>
          <select
            name="loteId"
            value={formData.loteId || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, loteId: Number(e.target.value) }))}
            className="border border-gray-300 rounded-md p-2 bg-white"
          >
            <option value="" disabled>Seleccionar lote</option>
            {lotes.map(lote => (
              <option key={lote.id} value={lote.id}>{lote.nombre}</option>
            ))}
          </select>
        </label>
      )}
      
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Cultivo</span>
        <select
          name="cultivoId"
          value={formData.cultivoId || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, cultivoId: e.target.value ? Number(e.target.value) : undefined }))}
          className="border border-gray-300 rounded-md p-2 bg-white"
        >
          <option value="">Sin Asignar</option>
          {cultivos.map(cultivo => (
            <option key={cultivo.id} value={cultivo.id}>{cultivo.nombre}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Broker MQTT (Opcional)</span>
        <select
          name="brokerId"
          value={formData.brokerId || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, brokerId: e.target.value ? Number(e.target.value) : null }))}
          className="border border-gray-300 rounded-md p-2 bg-white"
        >
          <option value="">Sin Asignar</option>
          {brokers.map(broker => (
            <option key={broker.id} value={broker.id}>{broker.nombre} ({broker.protocolo}{broker.host}:{broker.puerto})</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Selecciona el broker MQTT que se usará para recibir datos de los sensores de este surco.
        </p>
      </label>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors shadow-sm"
        >
          {isEditing ? 'Actualizar Surco' : 'Registrar Surco'}
        </button>
      </div>
    </div>
  );
}