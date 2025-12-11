import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, ArrowLeft, Trash2, MapPin } from 'lucide-react';
import L from 'leaflet';
import { obtenerLotes } from '../api/lotesApi';
import { obtenerSublotesPorLote, obtenerCultivos, crearSublote, actualizarSublote, eliminarSublote } from '../api/sublotesApi';
import { listarBrokers } from '../../iot/api/mqttConfigApi';
import SubloteForm from '../components/SubloteForm';
import SubloteMap from '../components/SubloteMap';
import { useModulePermissions } from '../../../features/user/hooks/useModulePermissions';
import type { Lote, Cultivo, Sublote, SubloteData } from '../interfaces/cultivos';
import type { Broker } from '../../iot/interfaces/iot';
import { Card, CardBody, CardHeader, Button, Modal, ModalContent, ModalHeader, ModalBody, Select, SelectItem } from '@heroui/react';
import PermissionWrapper from '../../../components/PermissionWrapper';

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
  const { hasPermissionInModule } = useModulePermissions();
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
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Cargar lotes y cultivos (siempre disponibles con Cultivo.Ver)
        const [lotesRes, cultivosRes] = await Promise.all([
          obtenerLotes(),
          obtenerCultivos()
        ]);

        const todosLosLotes: Lote[] = lotesRes.data || [];
        setLotes(todosLosLotes);
        setCultivos(cultivosRes.data?.data || cultivosRes.data || []);

        // Cargar brokers solo si el usuario tiene permisos de Iot
        if (hasPermissionInModule('Iot', 'Ver')) {
          try {
            const brokersRes = await listarBrokers();
            setBrokers(brokersRes || []);
          } catch (error) {
            console.warn('No se pudieron cargar brokers (permisos insuficientes):', error);
            setBrokers([]);
          }
        } else {
          setBrokers([]);
        }
      } catch (error) {
        toast.error("Error al cargar datos iniciales.");
      }
    };
    loadInitialData();
  }, [hasPermissionInModule]);

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


  const handleMapClick = (lat: number, lng: number) => {
    if (!loteSeleccionado) return;

    // Verificar permisos antes de permitir crear sublotes
    if (!hasPermissionInModule('Cultivo', 'Crear')) {
      // Sin permisos: no hacer nada, permitir zoom normal del mapa
      return;
    }

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

  // Filtrar sublotes por estado
  const sublotesFiltrados = filtroEstado === 'todos'
    ? sublotes
    : sublotes.filter(sublote => sublote.estado === filtroEstado);

  // (Removed unused handler for estado changes on sublotes)

  return (
    <div className="h-full flex flex-col space-y-6 p-6 bg-gray-50">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Gestión Sublotes</h1>
      </div>

      {!loteSeleccionado ? (
        // Vista de Lotes
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {lotes.map((lote) => (
              <Card
                key={lote.id}
                className="hover:shadow-lg transition-all duration-200 border-2 border-gray-200 hover:border-primary-400 hover:ring-2 hover:ring-primary-200"
                shadow="sm"
              >
                <CardHeader className="pb-2">
                  <h3 className="text-xl font-bold text-gray-800">{lote.nombre}</h3>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-600">Área Total:</span>
                      <span className="font-semibold text-gray-800">{lote.area} m²</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-600">Sublotes:</span>
                      <span className="font-semibold text-gray-800">{lote.sublotes?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-600">Estado:</span>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        lote.estado === 'Activo'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : lote.estado === 'Inactivo'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {lote.estado}
                      </span>
                    </div>
                  </div>
                  <PermissionWrapper module="Cultivo" permission="Ver">
                    <Button
                      onClick={() => handleLoteSeleccionado(lote)}
                      color="primary"
                      variant="solid"
                      className="w-full"
                    >
                      Gestionar Sublotes
                    </Button>
                  </PermissionWrapper>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      ) : (
        // Vista de Mapa del Lote Seleccionado
        <>
          <div className="flex justify-between items-center mb-6">
            <Button
              onClick={handleVolverLotes}
              variant="ghost"
              color="default"
              startContent={<ArrowLeft size={20} />}
              className="font-medium hover:bg-gray-100"
            >
              Volver a Lotes
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Panel Izquierdo - Lista de Sublotes */}
            {/* CAMBIO: Ahora ocupa 2/5 del ancho (40%) para dar más espacio a las tarjetas */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col h-[600px]">

              {/* Header fijo (no hace scroll) */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Sublotes de {loteSeleccionado.nombre} ({sublotesFiltrados.length})</h3>
                    <p className="text-sm text-gray-600 mt-1">Área total: {loteSeleccionado.area} m² • Estado: {loteSeleccionado.estado}</p>
                  </div>
                  <Select
                    placeholder="Filtrar por estado"
                    className="w-48"
                    size="sm"
                    selectedKeys={[filtroEstado]}
                    onSelectionChange={(keys) => setFiltroEstado(Array.from(keys)[0] as string)}
                  >
                    <SelectItem key="todos">Todos los estados</SelectItem>
                    <SelectItem key="Disponible">Disponible</SelectItem>
                    <SelectItem key="En siembra">En siembra</SelectItem>
                    <SelectItem key="En cosecha">En cosecha</SelectItem>
                    <SelectItem key="Mantenimiento">Mantenimiento</SelectItem>
                  </Select>
                </div>
              </div>

              {/* Lista Scrollable */}
              {/* CAMBIO CLAVE: 'overflow-y-auto' habilita el scroll solo dentro de este espacio restante */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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
                    {sublotesFiltrados.map((sublote) => (
                      <Card
                        key={sublote.id}
                        className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] border-2 ${
                          editingSublote?.id === sublote.id
                            ? 'border-primary bg-primary-50/50 shadow-lg ring-2 ring-primary-200'
                            : 'border-gray-200 hover:border-primary-300 hover:shadow-xl bg-white'
                        }`}
                        shadow="sm"
                        onClick={() => setEditingSublote(sublote)}
                      >
                        <CardBody className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  sublote.estado === 'Disponible' ? 'bg-green-500' :
                                  sublote.estado === 'En siembra' ? 'bg-blue-500' :
                                  sublote.estado === 'En cosecha' ? 'bg-yellow-500' :
                                  'bg-gray-500'
                                }`}></div>
                                <h5 className="font-bold text-gray-900 truncate text-base">{sublote.nombre}</h5>
                              </div>

                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="font-medium">Cultivo:</span>
                                <span className="truncate">{sublote.cultivo?.nombre || 'Sin asignar'}</span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${
                                  sublote.estado === 'Disponible'
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : sublote.estado === 'En siembra'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : sublote.estado === 'En cosecha'
                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                                }`}>
                                  <div className={`w-2 h-2 rounded-full mr-2 ${
                                    sublote.estado === 'Disponible' ? 'bg-green-500' :
                                    sublote.estado === 'En siembra' ? 'bg-blue-500' :
                                    sublote.estado === 'En cosecha' ? 'bg-yellow-500' :
                                    'bg-gray-500'
                                  }`}></div>
                                  {sublote.estado}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <PermissionWrapper module="Cultivo" permission="Editar">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSublote(sublote);
                                  }}
                                  isIconOnly
                                  variant="flat"
                                  color="primary"
                                  size="sm"
                                  className="w-8 h-8"
                                  title="Editar sublote"
                                >
                                  <Edit size={16} />
                                </Button>
                              </PermissionWrapper>
                              <PermissionWrapper module="Cultivo" permission="EliminarSublote">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSublote(sublote);
                                  }}
                                  isIconOnly
                                  variant="flat"
                                  color="danger"
                                  size="sm"
                                  className="w-8 h-8"
                                  title="Eliminar sublote"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </PermissionWrapper>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Panel Central - Mapa */}
            {/* CAMBIO: Ahora ocupa 3/5 del ancho (60%) para hacer el mapa más pequeño */}
            <div className="lg:col-span-3 bg-white rounded-lg shadow border border-gray-200 overflow-hidden relative z-0">
              <div className="relative">
                {/* Header del mapa */}
                <div className="absolute top-0 left-0 right-0 z-[5] bg-white/90 backdrop-blur-sm border-b border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-green-600" />
                        <h2 className="text-lg font-bold text-gray-800">{loteSeleccionado.nombre}</h2>
                      </div>
                      <span className="text-sm font-medium text-gray-600">Mapa Interactivo</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {hasPermissionInModule('Cultivo', 'Crear')
                        ? 'Clic para crear sublote • Selecciona para gestionar'
                        : 'Clic para hacer zoom • Selecciona para gestionar'
                      }
                    </div>
                  </div>
                </div>

                <SubloteMap
                  lote={loteSeleccionado}
                  sublotes={sublotesFiltrados}
                  onPointClick={handleMapClick}
                  height="600px"
                  center={getMapCenter(loteSeleccionado)}
                  zoom={getMapZoom(loteSeleccionado)}
                  canCreate={hasPermissionInModule('Cultivo', 'Crear')}
                />
              </div>
            </div>
          </div>

          {/* Panel Derecho - Formulario (cuando está abierto) */}
          {isFormOpen && (
            <Modal isOpen={isFormOpen} onOpenChange={() => setIsFormOpen(false)} size="2xl" scrollBehavior="inside">
              <ModalContent>
                <ModalHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {editingSublote?.id ? (
                        <Edit className="h-6 w-6 text-blue-600" />
                      ) : (
                        <Plus className="h-6 w-6 text-green-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {editingSublote?.id ? 'Editar Sublote' : 'Nuevo Sublote'}
                      </h3>
                      {editingSublote && !editingSublote.id && (
                        <p className="text-sm text-gray-600">
                          Creando sublote desde el mapa - completa los detalles
                        </p>
                      )}
                    </div>
                  </div>
                </ModalHeader>
                <ModalBody>
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
                </ModalBody>
              </ModalContent>
            </Modal>
          )}
        </>
      )}


      {/* Modal de Confirmación de Eliminación */}
      {isDeleteModalOpen && subloteToDelete && (
        <Modal isOpen={isDeleteModalOpen} onOpenChange={() => setIsDeleteModalOpen(false)} size="md">
          <ModalContent>
            <ModalHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Eliminar Sublote</h3>
              </div>
            </ModalHeader>
            <ModalBody>
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de que quieres eliminar el sublote <strong>"{subloteToDelete.nombre}"</strong>?
                Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSubloteToDelete(null);
                  }}
                  variant="light"
                  color="default"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmDeleteSublote}
                  color="danger"
                >
                  Eliminar
                </Button>
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

    </div>
  );
}