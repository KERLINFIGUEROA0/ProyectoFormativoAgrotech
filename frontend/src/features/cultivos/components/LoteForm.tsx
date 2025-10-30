import { useEffect, type ReactElement, useState } from 'react';
import { Input, Button } from "@heroui/react";
import { toast } from "sonner";
import type { Lote, LoteData, Coordenada } from '../interfaces/cultivos';

interface LoteFormProps {
  initialData?: Lote | null;
  onSave: (data: LoteData) => void;
  onCancel: () => void;
}

export default function LoteForm({ initialData, onSave, onCancel }: LoteFormProps): ReactElement {
  // Unificamos el estado en un solo objeto para mayor claridad
  const [formData, setFormData] = useState({
    nombre: '',
    area: '',
    estado: 'En preparación',
    coordenadasTexto: ''
  });

  useEffect(() => {
    if (initialData) {
      const textoCoordenadas = initialData.coordenadasPoligono
        ? initialData.coordenadasPoligono.map((c: Coordenada) => `${c.lng}, ${c.lat}`).join('\n')
        : '';
      
      setFormData({
        nombre: initialData.nombre || '',
        area: initialData.area || '',
        estado: initialData.estado || 'En preparación',
        coordenadasTexto: textoCoordenadas
      });
    } else {
      // Estado inicial para un lote nuevo
      setFormData({
        nombre: '',
        area: '',
        estado: 'En preparación',
        coordenadasTexto: ''
      });
    }
  }, [initialData]);

  const handleSubmit = () => {
    const { nombre, area, coordenadasTexto, estado } = formData;
    if (!nombre || !area || !coordenadasTexto) {
      toast.error("El nombre, el área y las coordenadas son requeridos.");
      return;
    }

    // La lógica para procesar las coordenadas sigue siendo la misma
    const coordenadasArray = coordenadasTexto.trim().split('\n').map(line => {
      const parts = line.split(',').map(part => part.trim());
      if (parts.length < 2) return null;

      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      
      if (isNaN(lat) || isNaN(lng)) return null;
      
      return { lat, lng }; 
    }).filter((c): c is Coordenada => c !== null);

    if (coordenadasArray.length < 3) {
      toast.error("Se necesitan al menos 3 puntos de coordenadas para formar un polígono.");
      return;
    }
    
    const payload: LoteData = {
      nombre,
      area: parseFloat(area),
      coordenadasPoligono: coordenadasArray,
      estado,
    };

    onSave(payload);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <Input 
        label="Nombre del Lote" 
        name="nombre" 
        value={formData.nombre} 
        onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))} 
        placeholder="Ej: Lote Norte A1" 
        fullWidth 
      />
      <Input 
        label="Área (m²)" 
        name="area" 
        type="number" 
        value={formData.area} 
        onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))} 
        placeholder="Ej: 1500.50" 
        fullWidth 
      />
      
      <div>
        <label className="text-sm font-medium text-gray-700">Coordenadas del Polígono</label>
        <textarea
          value={formData.coordenadasTexto}
          onChange={(e) => setFormData(prev => ({ ...prev, coordenadasTexto: e.target.value }))}
          placeholder="Pega aquí las coordenadas, una por línea. Formato: longitud, latitud&#10;Ej: -76.091171, 1.8928609"
          className="w-full h-32 border border-gray-300 rounded-md p-2 mt-1 text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Puedes copiar las coordenadas directamente del archivo KML.
        </p>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <Button onClick={onCancel} color="danger" variant="light">Cancelar</Button>
        <Button onClick={handleSubmit} color="success">Guardar Lote</Button>
      </div>
    </div>
  );
}