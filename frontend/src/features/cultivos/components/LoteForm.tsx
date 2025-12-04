import { useEffect, type ReactElement, useState } from 'react';
import { Input, Button, Textarea } from "@heroui/react";
import { toast } from "sonner";
import type { Lote, LoteData, Coordenada, CoordenadasGeo } from '../interfaces/cultivos';
import DrawMapModal from '../../../components/DrawMapModal';

interface LoteFormProps {
  initialData?: Lote | null;
  onSave: (data: LoteData) => void;
  onCancel: () => void;
}

export default function LoteForm({ initialData, onSave, onCancel }: LoteFormProps): ReactElement {
  const [formData, setFormData] = useState({
    nombre: '',
    area: '0', // El área se manejará como string para la coma decimal
    estado: 'En preparación',
    coordenadasTexto: ''
  });

  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [initialCoordinates, setInitialCoordinates] = useState<[number, number][]>([]);

  useEffect(() => {
    if (initialData) {
      const textoCoordenadas = initialData.coordenadas
        ? (initialData.coordenadas.type === 'polygon'
            ? (initialData.coordenadas.coordinates as Coordenada[]).map((c: Coordenada) => `${c.lng}, ${c.lat}`).join('\n')
            : `${(initialData.coordenadas.coordinates as Coordenada).lng}, ${(initialData.coordenadas.coordinates as Coordenada).lat}`)
        : '';

      const coordsArray: [number, number][] = textoCoordenadas.trim().split('\n').map(line => {
        const parts = line.split(',').map(part => part.trim());
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        return [lat, lng] as [number, number];
      }).filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));

      setFormData({
        nombre: initialData.nombre || '',
        // Convertir a string con coma para la edición
        area: (initialData.area || 0).toLocaleString('es-ES'),
        estado: initialData.estado || 'En preparación',
        coordenadasTexto: textoCoordenadas
      });
      setInitialCoordinates(coordsArray);
    } else {
      setFormData({
        nombre: '',
        area: '0',
        estado: 'En preparación',
        coordenadasTexto: ''
      });
      setInitialCoordinates([]);
    }
  }, [initialData]);

  const handleDrawConfirm = (coordinates: [number, number][], area: number) => {
    const coordenadasTexto = coordinates.map(coord => `${coord[1]}, ${coord[0]}`).join('\n');
    setFormData(prev => ({
      ...prev,
      coordenadasTexto,
      // Convertir a string con coma para mostrar en el input
      area: area.toLocaleString('es-ES')
    }));
    setIsDrawModalOpen(false);
  };

  const handleSubmit = () => {
    const { nombre, area: areaString, coordenadasTexto, estado } = formData;

    // Convertir el string del área (con coma) a un número
    const area = parseFloat(areaString.replace(',', '.'));

    if (!nombre || !area || !coordenadasTexto) {
      toast.error("El nombre, el área y las coordenadas son requeridos.");
      return;
    }

    const coordenadasArray = coordenadasTexto.trim().split('\n').map(line => {
      const parts = line.split(',').map(part => part.trim());
      if (parts.length < 2) return null;
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (isNaN(lat) || isNaN(lng)) return null;
      return { lat, lng };
    }).filter((c): c is Coordenada => c !== null);

    if (coordenadasArray.length < 3) {
      toast.error("Se necesitan al menos 3 puntos de coordenadas para formar el polígono.");
      return;
    }

    const coordenadas: CoordenadasGeo = {
      type: 'polygon',
      coordinates: coordenadasArray
    };

    const payload: LoteData = {
      nombre,
      area, // Enviar el área como número
      coordenadas,
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
        placeholder="Ej: Lote A1"
        fullWidth
      />
      <Input
        label="Área (m²)"
        name="area"
        type="text" // Cambiado a text para permitir comas
        value={formData.area}
        onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
        placeholder="Ej: 1500,50"
        fullWidth
      />
      
      <div>
        <label className="text-sm font-medium text-gray-700">Coordenadas del Polígono</label>
        <div className="flex gap-2 mb-2">
          <Button
            onClick={() => setIsDrawModalOpen(true)}
            color="primary"
            variant="flat"
            size="sm"
          >
            Dibujar en Mapa
          </Button>
        </div>
        <Textarea
          value={formData.coordenadasTexto}
          onChange={(e) => setFormData(prev => ({ ...prev, coordenadasTexto: e.target.value }))}
          placeholder="Pega aquí las coordenadas, una por línea. Formato: longitud, latitud&#10;Ej: -76.091171, 1.8928609"
          minRows={6}
          maxRows={10}
        />
        <p className="text-xs text-gray-500 mt-1">
          Usa las herramienta de Dibujar en mi Mapa para crear tu lote.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          onClick={onCancel}
          color="default"
          variant="light"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
        >
          {initialData?.id ? 'Actualizar Lote' : 'Registrar Lote'}
        </Button>
      </div>

      <DrawMapModal
        isOpen={isDrawModalOpen}
        onClose={() => setIsDrawModalOpen(false)}
        onConfirm={handleDrawConfirm}
        initialCoordinates={initialCoordinates}
      />
    </div>
  );
}