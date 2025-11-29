import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, ArrowLeft, Trash2, MapPin, X } from 'lucide-react';
import L from 'leaflet';
import { obtenerLotes } from '../api/lotesApi';
import { obtenerSublotesPorLote, obtenerCultivos, crearSublote, actualizarSublote, eliminarSublote } from '../api/sublotesApi';
import { listarBrokers } from '../../iot/api/mqttConfigApi';
import SubloteForm from '../components/SubloteForm';
import SubloteMap from '../components/SubloteMap';
import type { Lote, Cultivo, Sublote, SubloteData } from '../interfaces/cultivos';
import type { Broker } from '../../iot/interfaces/iot';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Función para verificar si un punto está dentro de un polígono (algoritmo ray casting)
function isPointInLote(lat: number, lng: number, lote: Lote): boolean {
  if (!lote.coordenadas) return false;

  let polygon: [number, number][] = [];

  if (lote.coordenadas.type === 'polygon' && Array.isArray(lote.coordenadas.coordinates)) {
    polygon = lote.coordenadas.coordinates.map(coord => [coord.lat, coord.lng]);
  } else if (lote.coordenadas.type === 'point') {
    // Si es un punto, crear un pequeño polígono alrededor
    const center = lote.coordenadas.coordinates as any;
    const size = 0.001; // Aproximadamente 100m
    polygon = [
      [center.lat - size, center.lng - size],
      [center.lat - size, center.lng + size],
      [center.lat + size, center.lng + size],
      [center.lat + size, center.lng - size],
    ];
  }

  if (polygon.length < 3) return false;

  // Algoritmo ray casting para punto en polígono
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0]; // lng, lat
    const xj = polygon[j][1], yj = polygon[j][0]; // lng, lat

    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

// (Removed unused local helpers for map click and polygon conversion)

// --- Componente Principal ---
export default function GestionProduccion(): ReactElement {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loteSeleccionado, setLoteSeleccionado] = useState<Lote | null>(null);
  const [sublotes, setSublotes] = useState<Sublote[]>([]);
  const [loadingSublotes, setLoadingSublotes] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSublote, setEditingSublote] = useState<Sublote | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subloteToDelete, setSubloteToDelete] = useState<Sublote | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [lotesRes, cultivosRes, brokersRes] = await Promise.all([
          obtenerLotes(),
          obtenerCultivos(),
          listarBrokers()
        ]);

        const todosLosLotes: Lote[] = lotesRes.data || [];
        const lotesActivos = todosLosLotes.filter(lote => lote.estado === 'Activo');

        setLotes(lotesActivos);
        setCultivos(cultivosRes.data?.data || cultivosRes.data || []);
        setBrokers(brokersRes || []);
      } catch (error) {
        toast.error("Error al cargar datos iniciales.");
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (loteSeleccionado) {
      loadSublotes();
    } else {
      setSublotes([]);
    }
  }, [loteSeleccionado]);

  const loadSublotes = async () => {
    if (!loteSeleccionado) return;

    setLoadingSublotes(true);
    try {
      const response = await obtenerSublotesPorLote(loteSeleccionado.id);
      const sublotesData = response.data?.data || [];
      setSublotes(sublotesData);
    } catch (error) {
      console.error('Error cargando sublotes:', error);
      toast.error('Error al cargar los sublotes');
    } finally {
      setLoadingSublotes(false);
    }
  };

  const handleLoteSeleccionado = (lote: Lote) => {
    setLoteSeleccionado(lote);
  };

  const handleVolverLotes = () => {
    setLoteSeleccionado(null);
    setSublotes([]);
    setIsFormOpen(false);
    setEditingSublote(null);
  };

  const handleNewSublote = () => {
    // Crear sublote temporal sin ubicación específica
    const tempSublote: Partial<Sublote> = {
      nombre: `Sublote ${sublotes.length + 1}`,
      lote: loteSeleccionado!
    };
    setEditingSublote(tempSublote as Sublote);
    setIsFormOpen(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!loteSeleccionado) return;

    // Verificar si el punto está dentro del lote
    if (isPointInLote(lat, lng, loteSeleccionado)) {
      setEditingSublote(null);
      setIsFormOpen(true);

      // Crear un sublote temporal con el punto seleccionado
      const tempSublote: Partial<Sublote> = {
        nombre: `Punto ${sublotes.length + 1}`,
        coordenadas: {
          type: 'point',
          coordinates: { lat, lng }
        },
        lote: loteSeleccionado
      };
      setEditingSublote(tempSublote as Sublote);
    } else {
      toast.error('El punto seleccionado está fuera del área del lote');
    }
  };

  // Función para calcular el centro óptimo del mapa basado en el lote
  const getMapCenter = (lote: Lote): [number, number] => {
    if (lote.coordenadas?.type === 'polygon' && Array.isArray(lote.coordenadas.coordinates)) {
      // Calcular centroide del polígono
      const coords = lote.coordenadas.coordinates;
      const centerLat = coords.reduce((sum, coord) => sum + coord.lat, 0) / coords.length;
      const centerLng = coords.reduce((sum, coord) => sum + coord.lng, 0) / coords.length;
      return [centerLat, centerLng];
    } else if (lote.coordenadas?.type === 'point') {
      const center = lote.coordenadas.coordinates as any;
      return [center.lat, center.lng];
    }
    return [4.6097, -74.0817]; // Centro de Colombia por defecto
  };

  // Función para calcular el zoom óptimo basado en el área del lote
  const getMapZoom = (lote: Lote): number => {
    const area = lote.area || 1000; // Área en m²

    // Zoom basado en el área: áreas más grandes necesitan zoom más alejado
    if (area > 100000) return 12; // Grandes fincas
    if (area > 50000) return 13;  // Medianas fincas
    if (area > 10000) return 14;  // Pequeñas fincas
    if (area > 5000) return 15;   // Huertos
    if (area > 1000) return 16;   // Jardines
    return 17; // Pequeños jardines o parcelas
  };

  const handleSaveSublote = async (data: SubloteData) => {
    try {
      if (editingSublote && editingSublote.id) {
        // Actualizar sublote existente
        await actualizarSublote(editingSublote.id, data);
        toast.success('Sublote actualizado correctamente');
      } else {
        // Crear nuevo sublote
        await crearSublote({ ...data, loteId: loteSeleccionado!.id });
        toast.success('Sublote creado correctamente');
      }

      await loadSublotes();
      setIsFormOpen(false);
      setEditingSublote(null);
    } catch (error) {
      console.error('Error guardando sublote:', error);
      toast.error('Error al guardar el sublote');
    }
  };

  const handleEditSublote = (sublote: Sublote) => {
    setEditingSublote(sublote);
    setIsFormOpen(true);
  };

  const handleDeleteSublote = (sublote: Sublote) => {
    setSubloteToDelete(sublote);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSublote = async () => {
    if (!subloteToDelete) return;

    try {
      await eliminarSublote(subloteToDelete.id);
      toast.success('Sublote eliminado correctamente');
      await loadSublotes();
      setIsDeleteModalOpen(false);
      setSubloteToDelete(null);
    } catch (error) {
      console.error('Error eliminando sublote:', error);
      toast.error('Error al eliminar el sublote');
    }
  };

  // (Removed unused handler for estado changes on sublotes)

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      {!loteSeleccionado ? (
        // Vista de Lotes
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Gestión de SubLotes</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {lotes.map((lote) => (
              <div key={lote.id} className="card p-4 border rounded shadow hover:shadow-lg">
                <h3 className="text-xl font-bold">{lote.nombre}</h3>
                <p>Área Total: {lote.area} m²</p>
                <p>Sublotes definidos: {lote.sublotes?.length || 0}</p>

                <button
                  onClick={() => handleLoteSeleccionado(lote)}
                  className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                >
                  Gestionar Sublotes
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        // Vista de Mapa del Lote Seleccionado
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleVolverLotes}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft size={20} /> Volver a Lotes
              </button>
              <div className="flex items-center gap-2">
                <MapPin className="h-6 w-6 text-green-600" />
                <h1 className="text-3xl font-bold text-gray-800">{loteSeleccionado.nombre}</h1>
              </div>
            </div>
            <button
              onClick={handleNewSublote}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={16} />
              Nuevo Sublote
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Panel Izquierdo - Lista de Sublotes */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Sublotes ({sublotes.length})</h3>
                <p className="text-sm text-gray-600 mt-1">Área total: {loteSeleccionado.area} m²</p>
              </div>

              <div className="max-h-96 overflow-y-auto p-4">
                {loadingSublotes ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Cargando sublotes...</p>
                  </div>
                ) : sublotes.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No hay sublotes</p>
                    <p className="text-xs text-gray-400 mt-1">Haz clic en el mapa para crear el primero</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sublotes.map((sublote) => (
                      <div
                        key={sublote.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          editingSublote?.id === sublote.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() => setEditingSublote(sublote)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 truncate">{sublote.nombre}</h5>
                            <p className="text-sm text-gray-500 truncate">Cultivo: {sublote.cultivo?.nombre || 'Sin asignar'}</p>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                              sublote.estado === 'Disponible'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {sublote.estado}
                            </span>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSublote(sublote);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar sublote"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSublote(sublote);
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Eliminar sublote"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Panel Central - Mapa */}
            <div className="lg:col-span-3 bg-white rounded-lg shadow border border-gray-200 overflow-hidden relative z-0">
              <div className="relative">
                {/* Header del mapa */}
                <div className="absolute top-0 left-0 right-0 z-[5] bg-white/90 backdrop-blur-sm border-b border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">Mapa Interactivo</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Clic para crear sublote • Selecciona para gestionar
                    </div>
                  </div>
                </div>

                <SubloteMap
                  lote={loteSeleccionado}
                  sublotes={sublotes}
                  onPointClick={handleMapClick}
                  height="600px"
                  center={getMapCenter(loteSeleccionado)}
                  zoom={getMapZoom(loteSeleccionado)}
                />
              </div>
            </div>
          </div>

          {/* Panel Derecho - Formulario (cuando está abierto) */}
          {isFormOpen && (
            <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-40 overflow-hidden flex flex-col">
              {/* Header del formulario */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {editingSublote?.id ? (
                      <Edit className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Plus className="h-5 w-5 text-green-600" />
                    )}
                    <h4 className="text-lg font-semibold text-gray-900">
                      {editingSublote?.id ? 'Editar Sublote' : 'Nuevo Sublote'}
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingSublote(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>
                {editingSublote && !editingSublote.id && (
                  <p className="text-sm text-gray-600 mt-2">
                    Creando sublote desde el mapa - completa los detalles
                  </p>
                )}
              </div>

              {/* Contenedor con scroll para el formulario */}
              <div className="flex-1 overflow-y-auto">
                <SubloteForm
                  initialData={{
                    id: editingSublote?.id,
                    nombre: editingSublote?.nombre || '',
                    loteId: loteSeleccionado.id,
                    cultivoId: editingSublote?.cultivo?.id,
                    coordenadasTexto: editingSublote?.coordenadas ?
                      (editingSublote.coordenadas.type === 'polygon' ?
                        (editingSublote.coordenadas.coordinates as any[]).map((c: any) => `${c.lng}, ${c.lat}`).join('\n') :
                        `${(editingSublote.coordenadas.coordinates as any).lng}, ${(editingSublote.coordenadas.coordinates as any).lat}`
                      ) : '',
                    brokerId: null,
                  }}
                  lotes={[loteSeleccionado]}
                  cultivos={cultivos}
                  brokers={brokers}
                  lotePadre={loteSeleccionado}
                  isQuickCreate={!editingSublote?.id}
                  onSave={handleSaveSublote}
                  onCancel={() => {
                    setIsFormOpen(false);
                    setEditingSublote(null);
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}


      {/* Modal de Confirmación de Eliminación */}
      {isDeleteModalOpen && subloteToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Eliminar Sublote</h3>
            </div>

            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que quieres eliminar el sublote <strong>"{subloteToDelete.nombre}"</strong>?
              Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSubloteToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteSublote}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}