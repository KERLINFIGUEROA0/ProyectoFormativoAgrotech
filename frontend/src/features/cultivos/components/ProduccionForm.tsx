import { useState, useEffect } from 'react';
import { Button } from "@heroui/react";
import { toast } from 'sonner';

// Definimos las props para mayor claridad y seguridad de tipos
interface ProduccionFormProps {
  onSave: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
  cultivoId: number; // Siempre será un número
}

export default function ProduccionForm({ onSave, onCancel, initialData = {}, cultivoId }: ProduccionFormProps) {
  // El estado del formulario se inicializa de forma más limpia
  const [formData, setFormData] = useState({
    cantidad: initialData.cantidad || '',
    fecha: initialData.fecha ? new Date(initialData.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    estado: initialData.estado || 'En Proceso',
  });

  // Efecto para actualizar el form si initialData cambia (al abrir el modal)
  useEffect(() => {
    setFormData({
      cantidad: initialData.cantidad || '',
      fecha: initialData.fecha ? new Date(initialData.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      estado: initialData.estado || 'En Proceso',
    });
  }, [initialData]);


  const handleSubmit = () => {
    if (!formData.cantidad || !formData.fecha) {
      toast.error("La cantidad y la fecha son requeridas.");
      return;
    }

    // --- ✅ CORRECCIÓN CLAVE AQUÍ ---
    // Creamos un 'payload' limpio solo con los datos que el backend necesita.
    const payload = {
      cantidad: parseInt(String(formData.cantidad), 10),
      fecha: formData.fecha,
      estado: formData.estado,
      cultivoId: initialData.cultivo?.id || cultivoId, // Usamos el ID del cultivo inicial si estamos editando
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