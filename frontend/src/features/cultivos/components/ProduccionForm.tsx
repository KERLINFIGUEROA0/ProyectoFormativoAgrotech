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
  const [formData, setFormData] = useState({
    cantidad: '',
    fecha: new Date().toISOString().split('T')[0],
    estado: 'En Proceso',
  });

  // ✅ --- INICIO DE LA CORRECCIÓN --- ✅
  // 1. Desestructuramos las propiedades de initialData para usarlas como dependencias.
  const { cantidad, fecha, estado } = initialData;

  useEffect(() => {
    // 2. Usamos las variables desestructuradas para establecer el estado del formulario.
    setFormData({
      cantidad: cantidad || '',
      fecha: fecha ? new Date(fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      estado: estado || 'En Proceso',
    });
  // 3. El array de dependencias ahora usa valores primitivos, lo que rompe el bucle infinito.
  }, [cantidad, fecha, estado]);
  // ✅ --- FIN DE LA CORRECCIÓN --- ✅

  const handleSubmit = () => {
    if (!formData.cantidad || !formData.fecha) {
      toast.error("La cantidad y la fecha son requeridas.");
      return;
    }
    
    const payload = {
      cantidad: parseInt(String(formData.cantidad), 10),
      fecha: formData.fecha,
      estado: formData.estado,
      cultivoId: initialData.cultivo?.id || cultivoId,
    };
    
    onSave(payload);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <input
        type="number"
        placeholder="Cantidad (kg)"
        value={formData.cantidad}
        onChange={(e) => setFormData(prev => ({ ...prev, cantidad: e.target.value }))}
        className="w-full border-2 border-gray-200 rounded-lg p-2"
      />
      <input
        type="date"
        value={formData.fecha}
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
        <Button onClick={onCancel} color="danger" variant="light">Cancelar</Button>
        <Button onClick={handleSubmit} color="success">Guardar</Button>
      </div>
    </div>
  );
}