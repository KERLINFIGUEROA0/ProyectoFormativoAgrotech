import { useState, useEffect, useMemo, type ReactElement } from 'react';
import { toast } from 'sonner';
import {
  Plus, Edit, DollarSign, BookCheck, Leaf,
  Search, Map as MapIcon, LayoutGrid, MapPin
} from 'lucide-react';
import { FaLeaf, FaThList, FaTools } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// Hero UI Imports
import {
  Card, CardBody, Button, Tabs, Tab, Input,
  Select, SelectItem, Chip, ScrollShadow, Divider,
  CardHeader, Tooltip, Switch, Progress
} from '@heroui/react';

// API & Components
import { listarCultivos, crearCultivo, actualizarCultivo, listarTiposCultivo, subirImagenCultivo, crearTipoCultivo, registrarCosecha } from '../api/cultivosApi';
import { obtenerLotes } from '../api/lotesApi';
import { obtenerSublotesPorLote } from '../api/sublotesApi';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import CultivoForm from '../components/CultivoForm';
import LotesMap from '../components/LotesMap';
import ModalUbicacionCultivo from '../components/ModalUbicacionCultivo';
import type { Cultivo, TipoCultivo, Lote, Sublote } from '../interfaces/cultivos';
import PermissionWrapper, { SmartPermissionWrapper } from "../../../components/PermissionWrapper";



export default function GestionCultivosPage(): ReactElement {
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [filteredCultivos, setFilteredCultivos] = useState<Cultivo[]>([]);
  const [tiposCultivo, setTiposCultivo] = useState<TipoCultivo[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [allSublotes, setAllSublotes] = useState<Sublote[]>([]);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [selectedSubloteCultivo, setSelectedSubloteCultivo] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'lista' | 'mapa'>('lista');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCultivo, setEditingCultivo] = useState<Cultivo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');


  // Estados para registrar cosecha
  const [showCosechaModal, setShowCosechaModal] = useState(false);
  const [cultivoCosecha, setCultivoCosecha] = useState<Cultivo | null>(null);
  const [fechaCosecha, setFechaCosecha] = useState(new Date().toISOString().split('T')[0]);
  const [cantidadCosecha, setCantidadCosecha] = useState('');
  const [esCosechaFinal, setEsCosechaFinal] = useState(false);

  // Estados para modal de ubicación
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [selectedCultivoUbicacion, setSelectedCultivoUbicacion] = useState<any>(null);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [cultivosRes, tiposRes, lotesRes] = await Promise.all([
        listarCultivos(),
        listarTiposCultivo(),
        obtenerLotes()
      ]);
      setCultivos(cultivosRes.data || []);
      setTiposCultivo(tiposRes.data || []);
      setLotes(lotesRes.data || []);

      // Obtener todos los sublotes de todos los lotes
      const allSublotesPromises = (lotesRes.data || []).map(async (lote: Lote) => {
        try {
          const sublotesRes = await obtenerSublotesPorLote(lote.id);
          return sublotesRes.data?.data || [];
        } catch (error) {
          console.error(`Error obteniendo sublotes del lote ${lote.id}:`, error);
          return [];
        }
      });

      const allSublotesArrays = await Promise.all(allSublotesPromises);
      const flattenedSublotes = allSublotesArrays.flat();
      setAllSublotes(flattenedSublotes);
    } catch {
      toast.error("Error al cargar los datos de cultivos.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Automatic refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtrado
  useEffect(() => {
    let filtered = cultivos;

    if (searchTerm) {
      filtered = filtered.filter(cultivo =>
        (cultivo.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cultivo.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cultivo.tipoCultivo?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (estadoFilter !== 'todos') {
      filtered = filtered.filter(cultivo => cultivo.Estado === estadoFilter);
    }

    setFilteredCultivos(filtered);
  }, [cultivos, searchTerm, estadoFilter, allSublotes]);

  // Estadísticas
  const stats = {
    total: cultivos.length,
    activos: cultivos.filter(c => c.Estado === 'Activo').length,
    tipos: new Set(cultivos.map(c => c.tipoCultivo?.id)).size,
    totalPlantas: cultivos.reduce((sum, c) => sum + (c.cantidad || 0), 0)
  };

  // Función para mapear estados
  const getEstadoDisplay = (estado: string) => {
    switch (estado) {
      case 'Activo':
        return 'En crecimiento';
      case 'En Cosecha':
        return 'En cosecha';
      case 'Finalizado':
        return 'Finalizado';
      default:
        return estado;
    }
  };

  // Obtener sublotes con cultivos
  const sublotesConCultivos = allSublotes
    .filter(s => s.cultivo !== null) // Solo sublotes que tienen cultivo asignado
    .map(s => ({
      id: s.id,
      nombre: s.nombre,
      coordenadas: s.coordenadas,
      cultivo: {
        id: s.cultivo!.id,
        nombre: s.cultivo!.nombre,
        tipoCultivo: { nombre: 'Tipo no disponible' }, // Por ahora, ya que no viene en la relación
        estado: 'Activo' // Por ahora, asumimos activo
      },
      lote: s.lote
    }));

  const openModal = (cultivo: Cultivo | null = null) => {
    setEditingCultivo(cultivo);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCultivo(null);
  };


  // Funciones para registrar cosecha
  const handleClickCosecha = (cultivo: Cultivo) => {
    setCultivoCosecha(cultivo);
    setFechaCosecha(new Date().toISOString().split('T')[0]);
    setCantidadCosecha('');
    setEsCosechaFinal(false);
    setShowCosechaModal(true);
  };

  const handleCantidadCosechaChange = (value: string) => {
    // Solo permitir números positivos (sin signos negativos ni letras)
    const filteredValue = value.replace(/[^0-9.]/g, '');
    setCantidadCosecha(filteredValue);
  };

  const handleConfirmarCosecha = async () => {
    if (!cultivoCosecha) return;

    const cantidad = parseFloat(cantidadCosecha);
    if (isNaN(cantidad) || cantidad <= 0) {
      toast.error("La cantidad debe ser un número positivo mayor a cero.");
      return;
    }

    try {
      await registrarCosecha(cultivoCosecha.id, fechaCosecha, cantidad, esCosechaFinal);
      toast.success(
        esCosechaFinal
          ? `Cosecha final registrada. Cultivo terminado y terrenos liberados.`
          : `Cosecha parcial registrada. El cultivo continúa activo.`
      );
      setShowCosechaModal(false);
      setCultivoCosecha(null);
      await fetchData(); // Recargar datos para ver cambios
    } catch (error: any) {
      console.error('Error al registrar cosecha:', error);
      toast.error(error.response?.data?.message || "Error al registrar la cosecha.");
    }
  };

  // Handler para abrir el modal de ubicación
  const handleVerUbicacion = (cultivo: any) => {
    setSelectedCultivoUbicacion(cultivo);
    setShowUbicacionModal(true);
  };

  const handleSelectLote = async (lote: Lote | null) => {
    setSelectedLote(lote);
    // Note: sublotes state was removed as it wasn't being used for rendering
    // The map uses sublotesConCultivos derived from allSublotes instead
  };

  // Memoizar initialData para evitar re-renders innecesarios
  const initialData = useMemo(() => {
    if (editingCultivo) {
      return {
        ...editingCultivo,
        tipoCultivoId: editingCultivo.tipoCultivo?.id,
        loteId: (editingCultivo as any).lote?.id,
        subloteId: (editingCultivo as any).sublotes?.[0]?.id || (editingCultivo as any).sublote?.id,
        Fecha_Plantado: editingCultivo.Fecha_Plantado
          ? new Date(editingCultivo.Fecha_Plantado).toISOString().split('T')[0]
          : ''
      };
    }
    return {};
  }, [editingCultivo]);

  const handleSave = async (data: any) => {
    const { imageFile, newTipoCultivoName, ...cultivoData } = data;
    const toastId = toast.loading("Guardando cultivo...");

    try {
      const finalCultivoData = { ...cultivoData };
      let cultivoId: number;

      if (newTipoCultivoName) {
        toast.info("Creando nuevo tipo...", { id: toastId });
        const newTipoRes = await crearTipoCultivo({ nombre: newTipoCultivoName });
        finalCultivoData.tipoCultivoId = newTipoRes.data.id;
      }

      if (editingCultivo) {
        // Caso Editar
        await actualizarCultivo(editingCultivo.id, finalCultivoData);
        cultivoId = editingCultivo.id;

        if (imageFile) {
          await subirImagenCultivo(cultivoId, imageFile);
        }
        toast.success("Cultivo actualizado.", { id: toastId });
      } else {
        // Caso Crear
        const res = await crearCultivo(finalCultivoData);

        cultivoId = res.data?.id;

        if (!cultivoId) {
          throw new Error("No se pudo obtener el ID del cultivo creado");
        }

        if (imageFile) {
          await subirImagenCultivo(cultivoId, imageFile);
        }
        toast.success("Cultivo creado.", { id: toastId });
      }

      await fetchData();
      closeModal();
    } catch (error: any) {
      console.error("Error en handleSave:", error);
      toast.error(error.response?.data?.message || "Error al guardar.", { id: toastId });
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-6 bg-gray-50">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-black-900">Gestión Cultivos</h1>
        <PermissionWrapper module='Cultivo' permission='Crear'>
          <Button
            onPress={() => openModal()}
            color="success"
            className="text-white font-bold shadow-md shadow-green-500/30"
            size="md"
            startContent={<Plus size={20} strokeWidth={2.5} />}
          >
            Nuevo Cultivo
          </Button>
        </PermissionWrapper>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cultivos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">registrados</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FaThList className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <Progress
              value={Math.min(stats.total * 10, 100)}
              className="mt-3"
              color="success"
              size="sm"
              aria-label={`Progreso de cultivos totales: ${stats.total}`}
            />
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activos}</p>
                <p className="text-xs text-gray-500">en crecimiento</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <FaLeaf className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <Progress
              value={(stats.activos / Math.max(stats.total, 1)) * 100}
              className="mt-3"
              color="warning"
              size="sm"
              aria-label={`Progreso de cultivos activos: ${stats.activos}`}
            />
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Variedades</p>
                <p className="text-2xl font-bold text-gray-900">{stats.tipos}</p>
                <p className="text-xs text-gray-500">tipos diferentes</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FaLeaf className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <Progress
              value={Math.min(stats.tipos * 20, 100)}
              className="mt-3"
              color="primary"
              size="sm"
              aria-label={`Progreso de variedades: ${stats.tipos}`}
            />
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Plantas</p>
                <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('es-CO').format(stats.totalPlantas)}</p>
                <p className="text-xs text-gray-500">plantadas</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <FaTools className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <Progress
              value={Math.min(stats.totalPlantas / 10, 100)}
              className="mt-3"
              color="danger"
              size="sm"
              aria-label={`Progreso de plantas totales: ${stats.totalPlantas}`}
            />
          </CardBody>
        </Card>
      </div>

      {/* --- CONTENEDOR PRINCIPAL TIPO "TARJETA FLOTANTE" --- */}
      {/* Esta es la Card grande blanca que contiene todo lo demás */}
      <Card className="flex-1 shadow-medium border border-gray-200 overflow-hidden bg-white">

        {/* Cabecera del Contenedor (Tabs y Filtros) */}
        <CardHeader className="flex flex-col sm:flex-row gap-4 justify-between items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-20">

          {/* Navegación Tabs */}
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as 'lista' | 'mapa')}
            variant="solid"
            color="primary"
            radius="lg"
            classNames={{
              tabList: "bg-gray-100 p-1",
              cursor: "bg-white shadow-sm",
              tab: "h-9 text-sm font-medium",
              tabContent: "group-data-[selected=true]:text-primary"
            }}
          >
            <Tab
              key="lista"
              title={
                <div className="flex items-center space-x-2">
                  <LayoutGrid size={16} />
                  <span>Listado</span>
                </div>
              }
            />
            <Tab
              key="mapa"
              title={
                <div className="flex items-center space-x-2">
                  <MapIcon size={16} />
                  <span>Mapa</span>
                </div>
              }
            />
          </Tabs>

          {/* Área de Filtros (solo visible en lista) */}
          {activeTab === 'lista' && (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
              <Input
                placeholder="Buscar cultivo..."
                startContent={<Search size={18} className="text-gray-400" />}
                value={searchTerm}
                onValueChange={setSearchTerm}
                size="sm"
                variant="bordered"
                classNames={{
                  inputWrapper: "bg-gray-50 border-gray-200 hover:border-gray-300 focus-within:!border-primary",
                }}
                className="w-full sm:w-64"
                isClearable
                onClear={() => setSearchTerm('')}
                aria-label="Buscar cultivos"
              />
              <Select
                placeholder="Estado Cultivo"
                startContent={<MapPin size={16} className="text-gray-400" />}
                selectedKeys={[estadoFilter]}
                onSelectionChange={(keys) => setEstadoFilter(Array.from(keys)[0] as string)}
                size="sm"
                variant="bordered"
                className="w-full sm:w-36"
                classNames={{
                  trigger: "bg-gray-50 border-gray-200 hover:border-gray-300",
                }}
              >
                <SelectItem key="todos">Todos</SelectItem>
                <SelectItem key="Activo">Activo</SelectItem>
                <SelectItem key="En Cosecha">En Cosecha</SelectItem>
                <SelectItem key="Finalizado">Finalizado</SelectItem>
              </Select>
            </div>
          )}
        </CardHeader>

        {/* Cuerpo del Contenedor (Scrollable) */}
        <CardBody className="p-0 overflow-hidden bg-gray-50/30">
          <ScrollShadow className="h-full w-full p-6">

            {activeTab === 'lista' ? (
              <>
                {filteredCultivos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Leaf size={48} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">No se encontraron cultivos</p>
                    <p className="text-sm">Intenta cambiar los filtros de búsqueda</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {filteredCultivos.map((cultivo) => (
                      <Card
                        key={cultivo.id}
                        className="w-full border border-gray-100 hover:shadow-lg transition-all duration-300 bg-white"
                        shadow="sm"
                        isPressable={false} // Importante para que los botones internos funcionen
                      >
                        {/* 1. IMAGEN DE CABECERA (Más bajita y elegante) */}
                        <div className="relative h-40 w-full overflow-hidden">
                          <img
                            src={`${import.meta.env.VITE_BACKEND_URL}/uploads/${cultivo.img}`}
                            alt={cultivo.nombre}
                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                            onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlhYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNpbiBpbWFnZW48L3RleHQ+PC9zdmc+'; }}
                          />
                          {/* Gradiente sutil para que el texto se lea bien */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                          {/* Botón Ubicación (Arriba a la izquierda) */}
                          <div className="absolute top-2 left-2">
                            <SmartPermissionWrapper module="Cultivo" action="Ver">
                              <Tooltip content="Ver ubicación exacta">
                                <Button
                                  isIconOnly
                                  className="bg-blue-500/90 backdrop-blur-sm text-white hover:bg-blue-600 min-w-8 w-8 h-8"
                                  size="sm"
                                  variant="solid"
                                  radius="md"
                                  onPress={() => handleVerUbicacion(cultivo)}
                                  aria-label="Ver ubicación"
                                >
                                  <MapPin size={14} />
                                </Button>
                              </Tooltip>
                            </SmartPermissionWrapper>
                          </div>

                          {/* Estado (Chip pequeño arriba a la derecha) */}
                          <div className="absolute top-2 right-2">
                            <Chip
                              color={
                                cultivo.Estado === 'Activo' ? 'success' :
                                  cultivo.Estado === 'En Cosecha' ? 'warning' :
                                    cultivo.Estado === 'Finalizado' ? 'default' : 'primary'
                              }
                              variant="solid"
                              size="sm"
                              classNames={{ content: "font-semibold text-white text-[10px]" }}
                            >
                              {getEstadoDisplay(cultivo.Estado)}
                            </Chip>
                          </div>

                          {/* Título y Tipo (Sobre la imagen) */}
                          <div className="absolute bottom-3 left-4">
                            <h3 className="text-lg font-bold text-white leading-none mb-1">
                              {cultivo.nombre}
                            </h3>
                            <p className="text-gray-300 text-xs font-medium flex items-center gap-1">
                              <Leaf size={10} /> {cultivo.tipoCultivo?.nombre}
                            </p>
                          </div>
                        </div>

                        {/* 2. CUERPO (Minimalista: Solo texto y separadores) */}
                        <CardBody className="px-4 py-3">
                          <div className="flex items-center justify-between h-full">
                            {/* Dato 1: Cantidad */}
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-400 font-medium uppercase">Total Plantas</span>
                              <span className="text-lg font-bold text-gray-800">{cultivo.cantidad}</span>
                            </div>

                            {/* Línea divisora vertical */}
                            <Divider orientation="vertical" className="h-8 bg-gray-200" />

                            {/* Dato 2: Fecha */}
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-gray-400 font-medium uppercase">Sembrado</span>
                              <span className="text-sm font-bold text-gray-800">
                                {new Date(cultivo.Fecha_Plantado).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                              </span>
                            </div>
                          </div>
                        </CardBody>

                        <Divider className="bg-gray-100" />

                        {/* 3. FOOTER (Botones en una sola línea) */}
                        <div className="p-3 flex items-center gap-2">
                          {/* Botón Producción (Verde con texto blanco) */}
                          <PermissionWrapper module="Cultivo" permission="RegistraryVerCosecha">
                            <Button
                              className="flex-1 font-semibold text-xs h-9 bg-green-600 text-white hover:bg-green-700"
                              size="sm"
                              variant="solid"
                              radius="md"
                              startContent={<DollarSign size={14} className="text-white" />}
                              onPress={() => navigate(`/cultivos/${cultivo.id}/produccion`)}
                            >
                              Producción
                            </Button>
                          </PermissionWrapper>

                          {/* Botón Trazabilidad (Azul con texto blanco) */}
                          <PermissionWrapper module="Cultivo" permission="VerTrazabilidad">
                            <Button
                              className="flex-1 font-semibold text-xs h-9 bg-blue-600 text-white hover:bg-blue-700"
                              size="sm"
                              variant="solid"
                              radius="md"
                              startContent={<BookCheck size={14} className="text-white" />}
                              onPress={() => navigate(`/cultivos/${cultivo.id}/trazabilidad`)}
                            >
                              Trazabilidad
                            </Button>
                          </PermissionWrapper>


                          {/* Botón Registrar Cosecha (Solo si no está finalizado) */}
                          {cultivo.Estado !== 'Finalizado' && (
                            <PermissionWrapper module="Cultivo" permission="RegistraryVerCosecha">
                              <Tooltip content="Registrar cosecha">
                                <Button
                                  isIconOnly
                                  className="bg-green-600 text-white hover:bg-green-700 min-w-9 w-9 h-9"
                                  size="sm"
                                  variant="solid"
                                  radius="md"
                                  onPress={() => handleClickCosecha(cultivo)}
                                  aria-label="Registrar cosecha"
                                >
                                  <DollarSign size={16} />
                                </Button>
                              </Tooltip>
                            </PermissionWrapper>
                          )}


                          {/* Botón Editar (Azul con icono blanco) */}
                          <PermissionWrapper module="Cultivo" permission="Editar">
                            <Tooltip content="Editar cultivo">
                              <Button
                                isIconOnly
                                className="bg-blue-600 text-white hover:bg-blue-700 min-w-9 w-9 h-9"
                                size="sm"
                                variant="solid"
                                radius="md"
                                onPress={() => openModal(cultivo)}
                                aria-label="Editar cultivo"
                              >
                                <Edit size={16} />
                              </Button>
                            </Tooltip>
                          </PermissionWrapper>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* VISTA DE MAPA */
              <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner relative">
                <SmartPermissionWrapper module="Cultivo" action="Ver">
                  <LotesMap
                    lotes={lotes}
                    selectedLote={selectedLote}
                    onSelectLote={handleSelectLote}
                    sublotesConCultivos={sublotesConCultivos}
                    selectedSubloteCultivo={selectedSubloteCultivo}
                    onSelectSubloteCultivo={setSelectedSubloteCultivo}
                    customInfo={(lote) => (
                      <div className="p-3 min-w-[180px]">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-800">{lote.nombre}</h4>
                          <Chip size="sm" color={lote.estado === 'Activo' ? 'success' : 'default'} variant="flat" className="h-5 text-[10px]">
                            {lote.estado}
                          </Chip>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <MapIcon size={12} /> Área: {lote.area} m²
                        </div>
                      </div>
                    )}
                  />
                  {/* Panel lateral informativo sobre el mapa */}
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg z-[400] border border-gray-100 w-64">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                      <MapIcon size={16} className="text-blue-500" /> Explorador de Lotes
                    </h4>
                    <p className="text-xs text-gray-500 mb-0">
                      Selecciona un lote para ver los detalles del lote, los sublotes que tiene y sus cultivos asociados.
                    </p>
                    {selectedLote && (
                      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-2">
                        <p className="text-xs font-semibold text-blue-700">Lote seleccionado:</p>
                        <p className="text-sm font-bold text-blue-900">{selectedLote.nombre}</p>
                      </div>
                    )}
                  </div>
                </SmartPermissionWrapper>
              </div>
            )}
          </ScrollShadow>
        </CardBody>
      </Card>

      {/* Modal de Formulario */}
      <Modal
        isOpen={isModalOpen}
        onOpenChange={closeModal}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Leaf className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {editingCultivo ? 'Editar Cultivo' : 'Nuevo Cultivo'}
              </h3>
              <p className="text-sm text-gray-600">Complete la información requerida</p>
            </div>
          </ModalHeader>
          <ModalBody>
            <CultivoForm
              initialData={initialData}
              tiposCultivo={tiposCultivo}
              cultivos={cultivos}
              onSave={handleSave}
              onCancel={closeModal}
            />
          </ModalBody>
        </ModalContent>
      </Modal>


      {/* Modal de Registrar Cosecha */}
      <Modal
        isOpen={showCosechaModal}
        onOpenChange={setShowCosechaModal}
        size="sm"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Registrar Cosecha</h3>
              <p className="text-sm text-gray-600">Cultivo: {cultivoCosecha?.nombre}</p>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                type="date"
                label="Fecha de Cosecha"
                value={fechaCosecha}
                onValueChange={setFechaCosecha}
                isRequired
              />
              <Input
                type="text"
                label="Cantidad Cosechada"
                placeholder="0.00"
                value={cantidadCosecha}
                onValueChange={handleCantidadCosechaChange}
                endContent={<span className="text-gray-500 text-sm">kg/unidades</span>}
                isRequired
              />
              <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-orange-800">¿Finalizar ciclo del cultivo?</p>
                  <p className="text-xs text-orange-600">
                    {esCosechaFinal
                      ? "⚠️ El cultivo se cerrará y los terrenos quedarán libres"
                      : "El cultivo continuará activo en el lote"
                    }
                  </p>
                </div>
                <Switch
                  isSelected={esCosechaFinal}
                  onValueChange={setEsCosechaFinal}
                  color="warning"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              className="bg-gray-200 text-white hover:bg-gray-600"
              onPress={() => setShowCosechaModal(false)}
            >
              Cancelar
            </Button>
            <Button
              color="success"
              className="text-white font-bold"
              onPress={handleConfirmarCosecha}
            >
              Registrar Cosecha
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de Ubicación de Cultivo */}
      {selectedCultivoUbicacion && (
        <ModalUbicacionCultivo
          isOpen={showUbicacionModal}
          onClose={() => setShowUbicacionModal(false)}
          cultivo={selectedCultivoUbicacion}
        />
      )}
    </div>
  );
}