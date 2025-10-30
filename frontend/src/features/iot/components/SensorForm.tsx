// src/features/iot/components/SensorForm.tsx
import { useState, useEffect, type ReactElement } from 'react';
import { Input, Button } from "@heroui/react";
import { toast } from "sonner";

// ... (la interfaz SensorFormProps sigue igual)
interface SensorFormProps {
  initialData?: any;
  surcos: any[];
  tiposSensor: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}


export default function SensorForm({ initialData = {}, surcos, tiposSensor, onSave, onCancel }: SensorFormProps): ReactElement {
  const [formData, setFormData] = useState(initialData);

  useEffect(() => {
    // Cuando se edita, el surcoId y tipoSensorId pueden venir en objetos anidados
    // Los extraemos para que los <select> funcionen correctamente
    const flatInitialData = {
        ...initialData,
        surcoId: initialData.surco?.id || initialData.surcoId,
        tipoSensorId: initialData.tipoSensor?.id || initialData.tipoSensorId,
    };
    setFormData(flatInitialData);
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const { nombre, surcoId, tipoSensorId, fecha_instalacion, valor_minimo_alerta, valor_maximo_alerta } = formData;
    if (!nombre || !surcoId || !tipoSensorId || !fecha_instalacion || !valor_minimo_alerta || !valor_maximo_alerta) {
      toast.error("Todos los campos son requeridos.");
      return;
    }

    // --- CORRECCIÓN AQUÍ ---
    // En lugar de enviar todo el 'formData', creamos un objeto 'payload' limpio
    // con solo los campos que el backend necesita.
    const payload = {
      nombre,
      surcoId: parseInt(surcoId, 10),
      tipoSensorId: parseInt(tipoSensorId, 10),
      fecha_instalacion,
      valor_minimo_alerta: parseFloat(valor_minimo_alerta),
      valor_maximo_alerta: parseFloat(valor_maximo_alerta),
      estado: formData.estado || 'Activo', // Aseguramos que el estado se envíe
    };
    
    onSave(payload);
  };

  // ... (el JSX del return no cambia)
  return (
    <div className="flex flex-col gap-4 p-4">
      <Input label="Nombre del Sensor" name="nombre" value={formData.nombre || ''} onChange={handleChange} placeholder="Ej: Sensor Temperatura 01" fullWidth />
      
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Ubicación (ID de Surco)</span>
          <select name="surcoId" value={formData.surcoId || ''} onChange={handleChange} className="border border-gray-300 rounded-md p-2 bg-white">
            <option value="" disabled>Seleccionar surco</option>
            {surcos.map(surco => (
              <option key={surco.id} value={surco.id}>{surco.nombre} (Lote: {surco.lote.nombre})</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Tipo de Sensor</span>
          <select name="tipoSensorId" value={formData.tipoSensorId || ''} onChange={handleChange} className="border border-gray-300 rounded-md p-2 bg-white">
            <option value="" disabled>Seleccionar tipo</option>
            {tiposSensor.map(tipo => (
              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
            ))}
          </select>
        </label>
      </div>

      <Input label="Fecha de Instalación" name="fecha_instalacion" type="date" value={formData.fecha_instalacion || ''} onChange={handleChange} fullWidth />

      <div className="grid grid-cols-2 gap-4">
          <Input label="Valor Mínimo del Sensor" name="valor_minimo_alerta" type="number" value={formData.valor_minimo_alerta || ''} onChange={handleChange} placeholder="Ej: 10" fullWidth />
          <Input label="Valor Máximo del Sensor" name="valor_maximo_alerta" type="number" value={formData.valor_maximo_alerta || ''} onChange={handleChange} placeholder="Ej: 30" fullWidth />
      </div>
      
      <div className="flex justify-end gap-3 mt-4">
        <Button onClick={onCancel} color="danger" variant="light">Cancelar</Button>
        <Button onClick={handleSubmit} color="success">Guardar Sensor</Button>
      </div>
    </div>
  );
}