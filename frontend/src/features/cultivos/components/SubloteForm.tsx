import { useState, useEffect, type ReactElement } from 'react';
import { Input } from "@heroui/react";
import { toast } from "sonner";
import { MapPin } from 'lucide-react';
import type { Lote, Cultivo, SubloteData, CoordenadasGeo } from '../interfaces/cultivos';
import type { Broker } from '../../iot/interfaces/iot';
import SelectorUbicacionMap from './SelectorUbicacionMap';
import FormModal from '../../../components/FormModal';

// Un tipo para manejar los datos del formulario de manera interna.
type SubloteFormData = {
  nombre: string;
  loteId: number;
  cultivoId?: number;
  coordenadasTexto: string;
  brokerId: number | null;
};

interface SubloteFormProps {
  initialData?: Partial<SubloteFormData> & { id?: number };
  lotes: Lote[];
  cultivos: Cultivo[];
  brokers: Broker[];
  lotePadre?: Lote;
  isQuickCreate?: boolean;
  onSave: (data: SubloteData) => void;
  onCancel: () => void;
}

export default function SubloteForm({ initialData = {}, lotes = [], lotePadre, isQuickCreate = false, onSave, onCancel }: SubloteFormProps): ReactElement {
  const [formData, setFormData] = useState<SubloteFormData>({
    nombre: '',
    loteId: 0,
    cultivoId: undefined,
    coordenadasTexto: '',
    brokerId: null,
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [coordenadasPunto, setCoordenadasPunto] = useState<{ lat: number; lng: number } | null>(null);

  const isEditing = Boolean(initialData && initialData.id);

  useEffect(() => {
    if (initialData) {
      const textoCoordenadas = initialData.coordenadasTexto || '';

      const coordsArray: [number, number][] = textoCoordenadas.trim().split('\n').map(line => {
        const parts = line.split(',').map(part => part.trim());
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        return [lat, lng] as [number, number];
      }).filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));

      setFormData({
        nombre: initialData.nombre || '',
        loteId: initialData.loteId || 0,
        cultivoId: initialData.cultivoId,
        coordenadasTexto: textoCoordenadas,
        brokerId: initialData.brokerId ?? null,
      });
    } else {
      setFormData({
        nombre: '',
        loteId: 0,
        cultivoId: undefined,
        coordenadasTexto: '',
        brokerId: null,
      });
    }
  }, [initialData]);


  const handlePuntoSeleccionado = (lat: number, lng: number) => {
    setCoordenadasPunto({ lat, lng });
  };

  const handleSubmit = () => {
    const { nombre, loteId, coordenadasTexto } = formData;

    // Modo creación rápida - solo validar nombre
    if (isQuickCreate && !isEditing) {
      if (!nombre || !coordenadasTexto) {
        toast.error("El nombre es requerido.");
        return;
      }

      // Crear coordenadas de punto desde el texto
      const parts = coordenadasTexto.split(',').map(part => part.trim());
      if (parts.length < 2) {
        toast.error("Las coordenadas no son válidas.");
        return;
      }

      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);

      if (isNaN(lat) || isNaN(lng)) {
        toast.error("Las coordenadas no son válidas.");
        return;
      }

      const coordenadas: CoordenadasGeo = {
        type: 'point',
        coordinates: { lat, lng }
      };

      const dataToSave: SubloteData = {
        nombre,
        coordenadas,
      };

      onSave(dataToSave);
      return;
    }

    // Validaciones para puntos de referencia
    if (!nombre) {
      toast.error("El nombre es requerido.");
      return;
    }

    if (!coordenadasPunto && !coordenadasTexto) {
      toast.error("Debes seleccionar una ubicación en el mapa.");
      return;
    }

    // Si tenemos coordenadas del punto seleccionado, las usamos
    if (coordenadasPunto) {
      const coordenadas: CoordenadasGeo = {
        type: 'point',
        coordinates: coordenadasPunto
      };

      const dataToSave: SubloteData = {
        nombre,
        coordenadas,
      };

      // Solo agregamos loteId si no estamos editando
      if (!isEditing && loteId) {
        dataToSave.loteId = loteId;
      }

      onSave(dataToSave);
      return;
    }

    // Si tenemos coordenadas del textarea (modo manual)
    if (coordenadasTexto) {
      const parts = coordenadasTexto.split(',').map(part => part.trim());
      if (parts.length < 2) {
        toast.error("El formato de coordenadas no es válido.");
        return;
      }

      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);

      if (isNaN(lat) || isNaN(lng)) {
        toast.error("Las coordenadas no son válidas.");
        return;
      }

      const coordenadas: CoordenadasGeo = {
        type: 'point',
        coordinates: { lat, lng }
      };

      const dataToSave: SubloteData = {
        nombre,
        coordenadas,
      };

      // Solo agregamos loteId si no estamos editando
      if (!isEditing && loteId) {
        dataToSave.loteId = loteId;
      }

      onSave(dataToSave);
    }
  };

  const loteActualNombre = isEditing
    ? lotes.find(l => l.id === formData.loteId)?.nombre || 'No disponible'
    : '';

  // Modo creación rápida - solo nombre
  if (isQuickCreate && !isEditing) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Crear Punto de Referencia</h3>
          <p className="text-sm text-gray-600">Ingresa un nombre para este punto</p>
        </div>

        <Input
          label="Nombre del Punto"
          name="nombre"
          value={formData.nombre}
          onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
          placeholder="Ej: Punto Norte, Sector A"
          fullWidth
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors shadow-sm"
          >
            Crear Punto
          </button>
        </div>
      </div>
    );
  }

  // Modo completo - formulario normal
  return (
    <div className="flex flex-col gap-4 p-4">
      <Input
        label="Nombre del Sublote"
        name="nombre"
        value={formData.nombre}
        onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
        placeholder="Ej: Sector Norte"
        fullWidth
      />


      {isEditing ? (
        <div>
          <label className="text-sm font-medium text-gray-700">Lote Asignado</label>
          <Input
            type="text"
            value={loteActualNombre}
            disabled
            fullWidth
          />
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium text-gray-700">Lote Padre</label>
          <select
            name="loteId"
            value={formData.loteId || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, loteId: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-md p-2 bg-white"
          >
            <option value="" disabled>Seleccionar lote padre</option>
            {lotes.map(lote => (
              <option key={lote.id} value={lote.id}>{lote.nombre}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-gray-700">Ubicación (Punto de Referencia)</label>

        <div className="flex items-center gap-4 mb-2">
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
          >
            <MapPin size={20} />
            {coordenadasPunto ? 'Cambiar Ubicación' : 'Seleccionar en el Mapa'}
          </button>

          {coordenadasPunto && (
            <span className="text-xs text-gray-500">
              Punto guardado: {coordenadasPunto.lat.toFixed(5)}, {coordenadasPunto.lng.toFixed(5)}
            </span>
          )}
        </div>


        <textarea
          value={formData.coordenadasTexto}
          onChange={(e) => setFormData(prev => ({ ...prev, coordenadasTexto: e.target.value }))}
          placeholder="Ingresa las coordenadas del punto. Formato: longitud, latitud&#10;Ej: -76.091171, 1.8928609"
          className="w-full h-20 border border-gray-300 rounded-md p-2 mt-1 text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Usa "Seleccionar en el Mapa" para elegir la ubicación del punto de referencia.
        </p>
      </div>


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
          {isEditing ? 'Actualizar Sublote' : 'Registrar Sublote'}
        </button>
      </div>

      {/* Modal del Selector de Ubicación */}
      <FormModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title="Selecciona la ubicación del Sublote"
        icon={<MapPin className="h-6 w-6 text-green-600" />}
      >
        <div className="p-4">
          {lotePadre?.coordenadas ? (
            <SelectorUbicacionMap
              coordenadasLotePadre={Array.isArray(lotePadre.coordenadas.coordinates)
                ? lotePadre.coordenadas.coordinates
                : [lotePadre.coordenadas.coordinates]}
              alSeleccionarPunto={handlePuntoSeleccionado}
              puntoInicial={coordenadasPunto}
            />
          ) : (
            <p className="text-red-500">Error: El lote padre no tiene coordenadas definidas para mostrar.</p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Confirmar Ubicación
            </button>
          </div>
        </div>
      </FormModal>

    </div>
  );
}