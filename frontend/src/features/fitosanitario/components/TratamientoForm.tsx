import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { Tratamiento } from '../interfaces/fitosanitario';
import type { Cultivo } from '../../cultivos/interfaces/cultivos'; // ✅ 1. Importamos la interfaz de Cultivo

// ✅ 2. Añadimos 'cultivos' a las props que el componente espera recibir
interface TratamientoFormProps {
  initialData?: Partial<Tratamiento>;
  onSave: (data: Partial<Tratamiento>) => void;
  onCancel: () => void;
  cultivos: Cultivo[]; // <--- NUEVA PROP
}

export default function TratamientoForm({ initialData = {}, onSave, onCancel, cultivos }: TratamientoFormProps) {
  const [formData, setFormData] = useState<Partial<Tratamiento>>({});

  useEffect(() => {
    // ✅ 3. Preparamos los datos iniciales, incluyendo el ID del cultivo si estamos editando
    const formattedData = {
      ...initialData,
      fechaInicio: initialData.fechaInicio ? new Date(initialData.fechaInicio).toISOString().split('T')[0] : '',
      fechaFinal: initialData.fechaFinal ? new Date(initialData.fechaFinal).toISOString().split('T')[0] : '',
      cultivoId: initialData.cultivo?.id, // <-- Obtenemos el ID del objeto cultivo
    };
    setFormData(formattedData);
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // ✅ 4. Convertimos el valor del cultivo a número si es seleccionado
    setFormData(prev => ({ ...prev, [name]: name === 'cultivoId' ? (value ? Number(value) : undefined) : value }));
  };

  const handleSubmit = () => {
    if (!formData.descripcion || !formData.tipo || !formData.fechaInicio) {
      toast.error('La descripción, el tipo y la fecha de inicio son obligatorios.');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="p-4 space-y-4">
      {/* --- ✅ 5. AÑADIMOS EL CAMPO DE SELECCIÓN PARA CULTIVO --- */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Cultivo Afectado (Opcional)</label>
        <select
          name="cultivoId"
          value={formData.cultivoId || ''}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white"
        >
          <option value="">Tratamiento General</option>
          {cultivos.map((cultivo) => (
            <option key={cultivo.id} value={cultivo.id}>
              {cultivo.nombre}
            </option>
          ))}
        </select>
      </div>
      {/* -------------------------------------------------------- */}

      <div>
        <label className="block text-sm font-medium text-gray-700">Descripción</label>
        <textarea
          name="descripcion"
          value={formData.descripcion || ''}
          onChange={handleChange}
          placeholder="Ej: Control preventivo de pulgón verde"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo de Tratamiento</label>
          <select
            name="tipo"
            value={formData.tipo || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white"
          >
            <option value="" disabled>Seleccione un tipo</option>
            <option value="Preventivo">Preventivo</option>
            <option value="Correctivo">Correctivo</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Estado</label>
          <select
            name="estado"
            value={formData.estado || 'Planificado'}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white"
          >
            <option value="Planificado">Planificado</option>
            <option value="En Curso">En Curso</option>
            <option value="Finalizado">Finalizado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
          <input
            type="date"
            name="fechaInicio"
            value={formData.fechaInicio || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha Final (Opcional)</label>
          <input
            type="date"
            name="fechaFinal"
            value={formData.fechaFinal || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
          />
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
          Cancelar
        </button>
        <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          Guardar Tratamiento
        </button>
      </div>
    </div>
  );
}

