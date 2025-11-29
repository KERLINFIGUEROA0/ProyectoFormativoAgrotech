import { useState, useEffect, type ReactElement } from 'react';
import { X, Plus, MapPin, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Lote, Sublote, SubloteData, Cultivo } from '../interfaces/cultivos';
import type { Broker } from '../../iot/interfaces/iot';
import { obtenerSublotesPorLote, crearSublote, actualizarSublote, obtenerCultivos, eliminarSublote } from '../api/sublotesApi';
import { listarBrokers } from '../../iot/api/mqttConfigApi';
import SubloteForm from './SubloteForm';
import SubloteMap from './SubloteMap';

interface LoteSublotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lote: Lote;
  onSubloteCreated?: () => void;
}

export default function LoteSublotesModal({ isOpen, onClose, lote, onSubloteCreated }: LoteSublotesModalProps): ReactElement {
  const [sublotes, setSublotes] = useState<Sublote[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSublote, setSelectedSublote] = useState<Sublote | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSublote, setEditingSublote] = useState<Sublote | null>(null);
  const [isQuickCreate, setIsQuickCreate] = useState(false);
  
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subloteToDelete, setSubloteToDelete] = useState<Sublote | null>(null);

  useEffect(() => {
    if (isOpen && lote) {
      loadSublotes();
      loadAdditionalData();
    }
  }, [isOpen, lote]);

  const loadAdditionalData = async () => {
    try {
      const [cultivosRes, brokersRes] = await Promise.all([
        obtenerCultivos(),
        listarBrokers()
      ]);
      setCultivos(cultivosRes.data?.data || cultivosRes.data || []);
      setBrokers(brokersRes || []);
    } catch (error) {
      console.error('Error cargando datos adicionales:', error);
    }
  };

  const loadSublotes = async () => {
    setLoading(true);
    try {
      const response = await obtenerSublotesPorLote(lote.id);
      const sublotesData = response.data?.data || [];
      setSublotes(sublotesData);

      // Nota: Mantenemos `sublotes` en estado; los puntos en mapa se generan dentro del componente de mapa cuando se requiera.
    } catch (error) {
      console.error('Error cargando sublotes:', error);
      toast.error('Error al cargar los sublotes');
    } finally {
      setLoading(false);
    }
  };

  // El manejo de clics en el mapa se hace inline al pasar `onPointClick` al componente `SubloteMap`.

  const handleSaveSublote = async (data: SubloteData) => {
    try {
      if (editingSublote && editingSublote.id) {
        // Actualizar sublote existente
        await actualizarSublote(editingSublote.id, data);
        toast.success('Sublote actualizado correctamente');
      } else {
        // Crear nuevo sublote
        await crearSublote({ ...data, loteId: lote.id });
        toast.success('Sublote creado correctamente');
      }

      await loadSublotes();
      setIsFormOpen(false);
      setEditingSublote(null);
      setSelectedSublote(null);
      onSubloteCreated?.();
    } catch (error) {
      console.error('Error guardando sublote:', error);
      toast.error('Error al guardar el sublote');
    }
  };

  const handleEditSublote = (sublote: Sublote) => {
    setEditingSublote(sublote);
    setSelectedSublote(sublote);
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


  if (!isOpen) return <></>;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      {/* Modal de Confirmación de Eliminación - Aparece PRIMERO */}
      {isDeleteModalOpen && subloteToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-md w-full mx-4 relative">
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

      <div className="w-full max-w-7xl h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Gestión de Sublotes</h3>
              <p className="text-sm text-gray-600">Lote: {lote.nombre} - Área: {lote.area} m²</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Panel Izquierdo - Lista de Sublotes */}
          <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-hidden flex flex-col">
            {/* Header del panel izquierdo */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-gray-900">Sublotes ({sublotes.length})</h4>
                <button
                  onClick={() => {
                    setEditingSublote(null);
                    setSelectedSublote(null);
                    setIsFormOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
                >
                  <Plus size={16} />
                  Nuevo
                </button>
              </div>
              <p className="text-sm text-gray-600">Haz clic en un sublote para ver detalles</p>
            </div>

            {/* Contenedor con scroll para la lista */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
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
                        selectedSublote?.id === sublote.id
                          ? 'border-green-500 bg-green-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedSublote(sublote)}
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
          <div className="flex-1 relative bg-gray-100">
            {/* Header del mapa */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Mapa Interactivo</span>
                </div>
                <div className="text-xs text-gray-600">
                  Clic para crear sublote
                </div>
              </div>
            </div>

            <SubloteMap
              lote={lote}
              sublotes={sublotes}
              onPointClick={(lat, lng) => {
                // Crear sublote con las coordenadas del punto clicado
                const tempSublote: Partial<Sublote> = {
                  nombre: `Punto ${sublotes.length + 1}`,
                  coordenadas: {
                    type: 'point',
                    coordinates: { lat, lng }
                  },
                  lote: lote
                };
                setEditingSublote(tempSublote as Sublote);
                setIsQuickCreate(true); // Flag para modo creación rápida
                setIsFormOpen(true);
              }}
              height="100%"
            />
          </div>

          {/* Panel Derecho - Formulario (cuando está abierto) */}
          {isFormOpen && (
            <div className="w-96 border-l border-gray-200 bg-white overflow-hidden flex flex-col">
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
                      setSelectedSublote(null);
                      setIsQuickCreate(false);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>
                {isQuickCreate && (
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
                    loteId: lote.id,
                    cultivoId: editingSublote?.cultivo?.id,
                    coordenadasTexto: editingSublote?.coordenadas ?
                      (editingSublote.coordenadas.type === 'polygon' ?
                        (editingSublote.coordenadas.coordinates as any[]).map((c: any) => `${c.lng}, ${c.lat}`).join('\n') :
                        `${(editingSublote.coordenadas.coordinates as any).lng}, ${(editingSublote.coordenadas.coordinates as any).lat}`
                      ) : '',
                    brokerId: null,
                  }}
                  lotes={[lote]}
                  cultivos={cultivos || []}
                  brokers={brokers || []}
                  lotePadre={lote}
                  isQuickCreate={isQuickCreate}
                  onSave={handleSaveSublote}
                  onCancel={() => {
                    setIsFormOpen(false);
                    setEditingSublote(null);
                    setSelectedSublote(null);
                    setIsQuickCreate(false);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}