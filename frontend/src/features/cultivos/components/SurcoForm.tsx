import { useState, useEffect, type ReactElement } from 'react';
import { Button } from "@heroui/react";
import type { Lote, Cultivo, SurcoData } from '../interfaces/cultivos';

// Un tipo para manejar los datos del formulario de manera interna.
// Hacemos todo parcial para manejar el estado inicial y la creación.
type SurcoFormData = Partial<{
  id: number;
  nombre: string;
  descripcion: string;
  loteId: number;
  cultivoId: number;
}>;

interface SurcoFormProps {
  initialData?: SurcoFormData;
  lotes: Lote[];
  cultivos: Cultivo[];
  onSave: (data: SurcoData) => void;
  onCancel: () => void;
}

export default function SurcoForm({ initialData = {}, lotes, cultivos, onSave, onCancel }: SurcoFormProps): ReactElement {
  const [formData, setFormData] = useState<SurcoFormData>(initialData);

  const isEditing = Boolean(initialData && initialData.id);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleSubmit = () => {
    // Aseguramos que los datos enviados cumplan con la interfaz SurcoData
    onSave(formData as SurcoData);
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
          <option value="">Sin Asignar</option> {/* Opción para no asignar cultivo */}
          {cultivos.map(cultivo => (
            <option key={cultivo.id} value={cultivo.id}>{cultivo.nombre}</option>
          ))}
        </select>
      </label>

      <div className="flex justify-end gap-3 mt-4">
        <Button onClick={onCancel} color="danger" variant="light">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} color="success">
          Guardar Surco
        </Button>
      </div>
    </div>
  );
}