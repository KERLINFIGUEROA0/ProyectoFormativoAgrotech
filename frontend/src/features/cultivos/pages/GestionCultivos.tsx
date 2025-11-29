import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { 
  Plus, Edit, DollarSign, BookCheck, Leaf, Sprout, CheckCircle, 
  Clock, Search, Filter, Map as MapIcon, LayoutGrid 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Hero UI Imports
import {
  Card, CardBody, Button, Tabs, Tab, Input,
  Select, SelectItem, Chip, ScrollShadow, Divider,
  CardHeader, Tooltip, Switch
} from '@heroui/react';

// API & Components
import { listarCultivos, crearCultivo, actualizarCultivo, listarTiposCultivo, subirImagenCultivo, crearTipoCultivo, finalizarCultivo, registrarCosecha } from '../api/cultivosApi';
import { obtenerLotes } from '../api/lotesApi';
import { obtenerSublotesPorLote } from '../api/sublotesApi';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import CultivoForm from '../components/CultivoForm';
import LotesMap from '../components/LotesMap';
import type { Cultivo, TipoCultivo, Lote, Sublote } from '../interfaces/cultivos';

// --- Componente StatCard Más Compacto (Menos altura) ---
const CompactStat = ({ icon, title, value, color }: { icon: ReactElement; title: string; value: number | string; color: 'primary' | 'danger' | 'success' | 'warning' }) => {
  const colorStyles = {
    primary: "bg-blue-100 text-blue-600",
    danger: "bg-red-100 text-red-600",
    success: "bg-green-100 text-green-600",
    warning: "bg-yellow-100 text-yellow-600",
  };

  return (
    <Card shadow="sm" className="border border-gray-100">
      {/* Reducimos el padding a p-3 y el gap a gap-3 */}
      <CardBody className="flex flex-row items-center gap-3 p-3">
        {/* Contenedor del icono más pequeño (p-2) y bordes un poco menos redondeados (rounded-lg) */}
        <div className={`p-2 rounded-lg ${colorStyles[color]}`}>
          {icon}
        </div>
        <div>
          {/* Texto más pequeño y en mayúsculas para mejor lectura en espacio reducido */}
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">
            {title}
          </p>
          {/* Value con leading-none para quitar altura de línea extra */}
          <p className="text-lg sm:text-xl font-extrabold text-gray-900 leading-none">
            {value}
          </p>
        </div>
      </CardBody>
    </Card>
  );
};

export default function GestionCultivosPage(): ReactElement {
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [filteredCultivos, setFilteredCultivos] = useState<Cultivo[]>([]);
  const [tiposCultivo, setTiposCultivo] = useState<TipoCultivo[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [sublotes, setSublotes] = useState<Sublote[]>([]);
  const [allSublotes, setAllSublotes] = useState<Sublote[]>([]);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [selectedSubloteCultivo, setSelectedSubloteCultivo] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'lista' | 'mapa'>('lista');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCultivo, setEditingCultivo] = useState<Cultivo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');

  // Estados para finalizar cultivo
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [cultivoAFinalizar, setCultivoAFinalizar] = useState<Cultivo | null>(null);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);

  // Estados para registrar cosecha
  const [showCosechaModal, setShowCosechaModal] = useState(false);
  const [cultivoCosecha, setCultivoCosecha] = useState<Cultivo | null>(null);
  const [fechaCosecha, setFechaCosecha] = useState(new Date().toISOString().split('T')[0]);
  const [cantidadCosecha, setCantidadCosecha] = useState('');
  const [esCosechaFinal, setEsCosechaFinal] = useState(false);

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
    } catch (error) {
      toast.error("Error al cargar los datos de cultivos.");
    }
  };

  useEffect(() => {
    fetchData();
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
  }, [cultivos, searchTerm, estadoFilter]);

  // Estadísticas
  const stats = {
    total: cultivos.length,
    activos: cultivos.filter(c => c.Estado === 'Activo').length,
    tipos: new Set(cultivos.map(c => c.tipoCultivo?.id)).size,
    totalPlantas: cultivos.reduce((sum, c) => sum + (c.cantidad || 0), 0)
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

  // Funciones para finalizar cultivo
  const handleClickFinalizar = (cultivo: Cultivo) => {
    setCultivoAFinalizar(cultivo);
    setFechaFin(new Date().toISOString().split('T')[0]);
    setShowFinalizarModal(true);
  };

  const handleConfirmarFinalizar = async () => {
    if (!cultivoAFinalizar) return;

    try {
      await finalizarCultivo(cultivoAFinalizar.id, fechaFin);
      toast.success(`Cultivo "${cultivoAFinalizar.nombre}" finalizado correctamente. Los terrenos han sido liberados.`);
      setShowFinalizarModal(false);
      setCultivoAFinalizar(null);
      await fetchData(); // Recargar datos para ver cambios
    } catch (error: any) {
      console.error('Error al finalizar cultivo:', error);
      toast.error(error.response?.data?.message || "Error al finalizar el cultivo.");
    }
  };

  // Funciones para registrar cosecha
  const handleClickCosecha = (cultivo: Cultivo) => {
    setCultivoCosecha(cultivo);
    setFechaCosecha(new Date().toISOString().split('T')[0]);
    setCantidadCosecha('');
    setEsCosechaFinal(false);
    setShowCosechaModal(true);
  };

  const handleConfirmarCosecha = async () => {
    if (!cultivoCosecha) return;

    const cantidad = parseFloat(cantidadCosecha);
    if (isNaN(cantidad) || cantidad < 0) {
      toast.error("La cantidad debe ser un número válido mayor o igual a cero.");
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

  const handleSelectLote = async (lote: Lote | null) => {
    setSelectedLote(lote);
    if (lote) {
      try {
        const sublotesRes = await obtenerSublotesPorLote(lote.id);
        setSublotes(sublotesRes.data || []);
      } catch (error) {
        toast.error("Error al cargar sublotes.");
        setSublotes([]);
      }
    } else {
      setSublotes([]);
    }
  };

  const handleSave = async (data: any) => {
    const { imageFile, newTipoCultivoName, ...cultivoData } = data;
    const toastId = toast.loading("Guardando cultivo...");

    try {
      let finalCultivoData = { ...cultivoData };
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

        // ⚠️ CORRECCIÓN CRÍTICA: Acceder correctamente al ID
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
    <div className="flex flex-col h-full w-full bg-gray-50/30 gap-6 p-6">
      
      {/* --- CABECERA Y ESTADÍSTICAS --- */}
      <div className="flex flex-col gap-6 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Gestión de Cultivos</h1>
            <p className="text-gray-500 mt-1">Administra tu producción agrícola de forma eficiente.</p>
          </div>
          <Button 
            onPress={() => openModal()} 
            color="primary" 
            className="font-semibold shadow-md shadow-blue-500/30"
            size="lg"
            startContent={<Plus size={20} strokeWidth={2.5} />}
          >
            Nuevo Cultivo
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CompactStat icon={<Sprout size={24} />} title="Total Cultivos" value={stats.total} color="success" />
          <CompactStat icon={<CheckCircle size={24} />} title="Activos" value={stats.activos} color="primary" />
          <CompactStat icon={<Leaf size={24} />} title="Variedades" value={stats.tipos} color="warning" />
          <CompactStat icon={<Clock size={24} />} title="Total Plantas" value={new Intl.NumberFormat('es-CO').format(stats.totalPlantas)} color="danger" />
        </div>
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
                placeholder="Estado"
                startContent={<Filter size={16} className="text-gray-400" />}
                selectedKeys={[estadoFilter]}
                onSelectionChange={(keys) => setEstadoFilter(Array.from(keys)[0] as string)}
                size="sm"
                variant="bordered"
                className="w-full sm:w-40"
                classNames={{
                  trigger: "bg-gray-50 border-gray-200 hover:border-gray-300",
                }}
              >
                <SelectItem key="todos">Todos</SelectItem>
                <SelectItem key="Activo">En Crecimiento</SelectItem>
                <SelectItem key="En Cosecha">En Cosecha</SelectItem>
                <SelectItem key="Finalizado">Finalizados</SelectItem>
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

                          {/* Estado (Chip pequeño arriba) */}
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
                              {cultivo.Estado}
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
                                {new Date(cultivo.Fecha_Plantado).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </CardBody>

                        <Divider className="bg-gray-100" />

                        {/* 3. FOOTER (Botones en una sola línea) */}
                        <div className="p-3 flex items-center gap-2">
                          {/* Botón Producción (Verde con texto blanco) */}
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

                          {/* Botón Trazabilidad (Azul con texto blanco) */}
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

                          {/* Botón Registrar Cosecha (Solo si no está finalizado) */}
                          {cultivo.Estado !== 'Finalizado' && (
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
                          )}

                          {/* Botón Editar (Azul con icono blanco) */}
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
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* VISTA DE MAPA */
              <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner relative">
                <LotesMap
                  lotes={lotes}
                  selectedLote={selectedLote}
                  onSelectLote={handleSelectLote}
                  sublotesConCultivos={sublotesConCultivos}
                  selectedSubloteCultivo={selectedSubloteCultivo}
                  onSelectSubloteCultivo={setSelectedSubloteCultivo}
                  customInfo={(lote) => (
                    <div className="p-3 min-w-[220px]">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-800">{lote.nombre}</h4>
                        <Chip size="sm" color={lote.estado === 'Activo' ? 'success' : 'default'} variant="flat" className="h-5 text-[10px]">
                          {lote.estado}
                        </Chip>
                      </div>
                      <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                        <MapIcon size={12}/> {lote.area} m²
                      </div>
                      <Divider className="my-2"/>
                      <p className="text-xs font-bold text-gray-700 mb-1">Sublotes ({sublotes.length}):</p>
                      {sublotes.length > 0 ? (
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                          {sublotes.map(s => (
                            <div key={s.id} className="text-xs flex justify-between items-center bg-gray-50 p-1 rounded">
                              <span className="text-gray-600">{s.nombre}</span>
                              <span className="font-semibold text-blue-600">{s.cultivo?.nombre || '-'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-gray-400">Sin sublotes definidos</span>
                      )}
                    </div>
                  )}
                />
                {/* Panel lateral informativo sobre el mapa */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg z-[400] border border-gray-100 w-64">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                    <MapIcon size={16} className="text-blue-500"/> Explorador de Lotes
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
              initialData={editingCultivo ? { ...editingCultivo, tipoCultivoId: editingCultivo.tipoCultivo?.id } : {}}
              tiposCultivo={tiposCultivo}
              cultivos={cultivos}
              onSave={handleSave}
              onCancel={closeModal}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Modal de Finalizar Cultivo */}
      <Modal
        isOpen={showFinalizarModal}
        onOpenChange={setShowFinalizarModal}
        size="sm"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Finalizar Cultivo</h3>
              <p className="text-sm text-gray-600">Cosecha terminada - Liberar terrenos</p>
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 mb-4">
              Vas a finalizar el cultivo <strong>"{cultivoAFinalizar?.nombre}"</strong>.
              Esto liberará automáticamente los lotes y sublotes asociados para que puedan ser reutilizados.
            </p>
            <Input
              type="date"
              label="Fecha de Finalización"
              value={fechaFin}
              onValueChange={setFechaFin}
              isRequired
              className="mb-2"
            />
            <p className="text-xs text-gray-500">
              Los terrenos quedarán disponibles para nuevos cultivos después de la finalización.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              onPress={() => setShowFinalizarModal(false)}
            >
              Cancelar
            </Button>
            <Button
              color="success"
              className="text-white"
              onPress={handleConfirmarFinalizar}
            >
              Confirmar y Liberar Lotes
            </Button>
          </ModalFooter>
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
                type="number"
                label="Cantidad Cosechada"
                placeholder="0.00"
                value={cantidadCosecha}
                onValueChange={setCantidadCosecha}
                endContent={<span className="text-gray-500 text-sm">kg/unidades</span>}
                isRequired
                min="0"
                step="0.01"
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
              onPress={() => setShowCosechaModal(false)}
            >
              Cancelar
            </Button>
            <Button
              color="success"
              className="text-white"
              onPress={handleConfirmarCosecha}
            >
              Registrar Cosecha
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}