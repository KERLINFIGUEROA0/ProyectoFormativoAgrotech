import { useState, useEffect } from 'react';
import { Button } from "@heroui/react";
import { toast } from 'sonner';

interface ProduccionFormProps {
  onSave: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
  cultivoId: number;
}

export default function ProduccionForm({ onSave, onCancel, initialData = {}, cultivoId }: ProduccionFormProps) {
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    cantidad: '',
    fecha: getTodayDate(),
    estado: 'En Proceso',
  });

  // ✅ --- INICIO DE LA CORRECCIÓN --- ✅
  // 1. Desestructuramos las propiedades de initialData para usarlas como dependencias.
  const { cantidad, fecha, estado } = initialData;

  useEffect(() => {
    // 2. Usamos las variables desestructuradas para establecer el estado del formulario.
    setFormData({
      cantidad: cantidad || '',
      fecha: fecha ? new Date(fecha).toISOString().split('T')[0] : getTodayDate(),
      estado: estado || 'En Proceso',
    });
  // 3. El array de dependencias ahora usa valores primitivos, lo que rompe el bucle infinito.
  }, [cantidad, fecha, estado]);
  // ✅ --- FIN DE LA CORRECCIÓN --- ✅

  const handleCantidadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Solo permitir números positivos (sin signos negativos)
    const filteredValue = value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, cantidad: filteredValue }));
  };

  const handleSubmit = () => {
    if (!formData.cantidad || !formData.fecha) {
      toast.error("La cantidad y la fecha son requeridas.");
      return;
    }

    const cantidadNum = parseInt(String(formData.cantidad), 10);
    if (cantidadNum <= 0) {
      toast.error("La cantidad debe ser un número positivo mayor a cero.");
      return;
    }

    const payload = {
      cantidad: cantidadNum,
      fecha: formData.fecha,
      estado: formData.estado,
      cultivoId: initialData.cultivo?.id || cultivoId,
    };

    onSave(payload);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <input
        type="text"
        placeholder="Cantidad (kg)"
        value={formData.cantidad}
        onChange={handleCantidadChange}
        className="w-full border-2 border-gray-200 rounded-lg p-2"
      />
      <input
        type="date"
        value={formData.fecha}
        min={getTodayDate()}
        onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
        className="w-full border-2 border-gray-200 rounded-lg p-2"
      />
      <select
        value={formData.estado}
        onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
        className="w-full border-2 border-gray-200 rounded-lg p-2 bg-white"
      >
        <option value="Programado">Programado</option>
        <option value="En Proceso">En Proceso</option>
        <option value="Cosechado">Cosechado</option>
      </select>
      <div className="flex justify-end gap-3 mt-4">
        <Button onClick={onCancel} className="bg-gray-200 text-gray-800 font-light hover:bg-gray-300">Cancelar</Button>
        <Button onClick={handleSubmit} className="bg-green-600 text-white font-bold hover:bg-green-700">Guardar</Button>
      </div>
    </div>
  );
}