import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { FaLeaf, FaThList, FaTools, FaMapMarkerAlt, FaEdit } from 'react-icons/fa';
import { Plus } from 'lucide-react';
import { obtenerLotes, crearLote, actualizarLote, obtenerEstadisticasLotes } from '../api/lotesApi';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import LoteForm from '../components/LoteForm';
import LotesMap from '../components/LotesMap';
import type { Lote, LoteData } from '../interfaces/cultivos';
import { Card, CardBody, CardHeader, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Select, SelectItem, Pagination, Progress } from '@heroui/react';


export default function GestionLotesPage(): ReactElement {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    enPreparacion: 0,
    parcialmenteOcupado: 0,
    enCultivo: 0,
    enMantenimiento: 0
  });
  const [filterStatus, setFilterStatus] = useState<'all' | 'En preparación' | 'Parcialmente ocupado' | 'En cultivación' | 'En mantenimiento'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const location = useLocation(); 

    const fetchData = useCallback(async () => {
    try {
      const [lotesResponse, statsResponse] = await Promise.all([obtenerLotes(), obtenerEstadisticasLotes()]);
      const fetchedLotes: Lote[] = lotesResponse.data || [];
      setLotes(fetchedLotes);
      setStats(statsResponse.data);
    } catch {
      toast.error("Error al cargar los datos de los lotes.");
    }
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [location]);

  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  // 🔥 NUEVA FUNCIÓN: Maneja la actualización en tiempo real desde el mapa
  const handleLotesUpdate = (updatedLotes: Lote[]) => {
    // 1. Actualizar la lista visual de lotes (Tabla y Mapa)
    setLotes(updatedLotes);

    // 2. Refrescar las estadísticas para que los contadores coincidan
    obtenerEstadisticasLotes()
      .then((res) => setStats(res.data))
      .catch((err) => console.error("Error actualizando stats:", err));

    toast.success("Estado del lote actualizado en tiempo real");
  };

const handleSave = async (data: LoteData) => {
   const toastId = toast.loading("Guardando lote...");
   try {
     let updatedLote: any;
     if (editingLote) {
       updatedLote = await actualizarLote(editingLote.id, data);
       // Actualizar el lote en el estado local inmediatamente
       setLotes(prevLotes => prevLotes.map(lote => lote.id === editingLote.id ? updatedLote.data : lote));
       toast.success("Lote actualizado con éxito.", { id: toastId });
     } else {
       updatedLote = await crearLote(data);
       // Agregar el nuevo lote al estado local inmediatamente
       setLotes(prevLotes => [...prevLotes, updatedLote.data]);
       toast.success("Lote creado con éxito.", { id: toastId });
     }
     // Refrescar datos en segundo plano para asegurar consistencia
     fetchData();
     // Seleccionamos el lote recién creado o editado en el mapa
     setSelectedLote(updatedLote.data);
     closeModal();
   } catch (error: unknown) {
     const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Error al guardar el lote.";
     toast.error(message, { id: toastId });
   }
 };
  

  const openModal = (lote: Lote | null = null) => {
    setEditingLote(lote);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLote(null);
  };
  
  // ✅ ELIMINADAS: Funciones de eliminación
  // Los lotes se reutilizan cambiando coordenadas, nunca se eliminan

const handleViewLocation = (lote: Lote) => {
    setSelectedLote(lote);
    toast.info(`Mostrando ubicación del ${lote.nombre}`);
  };
  
  const filteredLotes = lotes.filter(lote => {
    if (filterStatus === 'all') return true;
    return lote.estado === filterStatus;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLotes = filteredLotes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLotes.length / itemsPerPage);

  return (
    <div className="h-full flex flex-col space-y-4 md:space-y-6 p-4 md:p-6 bg-gray-50">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Gestión Lotes</h1>
        <Button
          onPress={() => openModal()}
          color="success"
          className="font-semibold"
          size="sm"
          startContent={<Plus size={16} strokeWidth={2.5} />}
        >
          Nuevo Lote
        </Button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-3">
        <Card className="border-l-4 border-l-green-500">
          <CardBody className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Lotes</p>
                <p className="text-lg md:text-xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">registrados</p>
              </div>
              <div className="p-1.5 md:p-2 bg-green-100 rounded-full">
                <FaThList className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
            </div>
            <Progress
              value={Math.min(stats.total * 10, 100)}
              className="mt-2 md:mt-3"
              color="success"
              size="sm"
              aria-label={`Progreso de lotes totales: ${stats.total}`}
            />
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardBody className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Preparación</p>
                <p className="text-lg md:text-xl font-bold text-gray-900">{stats.enPreparacion}</p>
                <p className="text-xs text-gray-500">pendientes</p>
              </div>
              <div className="p-1.5 md:p-2 bg-yellow-100 rounded-full">
                <FaTools className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
              </div>
            </div>
            <Progress
              value={(stats.enPreparacion / Math.max(stats.total, 1)) * 100}
              className="mt-2 md:mt-3"
              color="warning"
              size="sm"
              aria-label={`Progreso de lotes en preparación: ${stats.enPreparacion}`}
            />
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardBody className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Parcialmente Ocupado</p>
                <p className="text-lg md:text-xl font-bold text-gray-900">{stats.parcialmenteOcupado}</p>
                <p className="text-xs text-gray-500">algunos cultivos</p>
              </div>
              <div className="p-1.5 md:p-2 bg-blue-100 rounded-full">
                <FaLeaf className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
            </div>
            <Progress
              value={(stats.parcialmenteOcupado / Math.max(stats.total, 1)) * 100}
              className="mt-2 md:mt-3"
              color="primary"
              size="sm"
              aria-label={`Progreso de lotes parcialmente ocupados: ${stats.parcialmenteOcupado}`}
            />
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardBody className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Cultivo</p>
                <p className="text-lg md:text-xl font-bold text-gray-900">{stats.enCultivo}</p>
                <p className="text-xs text-gray-500">completamente activos</p>
              </div>
              <div className="p-1.5 md:p-2 bg-green-100 rounded-full">
                <FaLeaf className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
            </div>
            <Progress
              value={(stats.enCultivo / Math.max(stats.total, 1)) * 100}
              className="mt-2 md:mt-3"
              color="success"
              size="sm"
              aria-label={`Progreso de lotes en cultivo: ${stats.enCultivo}`}
            />
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardBody className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Mantenimiento</p>
                <p className="text-lg md:text-xl font-bold text-gray-900">{stats.enMantenimiento}</p>
                <p className="text-xs text-gray-500">requieren atención</p>
              </div>
              <div className="p-1.5 md:p-2 bg-red-100 rounded-full">
                <FaTools className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
              </div>
            </div>
            <Progress
              value={(stats.enMantenimiento / Math.max(stats.total, 1)) * 100}
              className="mt-2 md:mt-3"
              color="danger"
              size="sm"
              aria-label={`Progreso de lotes en mantenimiento: ${stats.enMantenimiento}`}
            />
          </CardBody>
        </Card>
      </div>

      
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-grow min-h-0">
        <div className="w-full lg:flex-1 xl:flex-[3] flex flex-col min-w-0">
          <Card className="p-4 w-full h-full flex flex-col">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-600">Lista de Lotes</h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select
                  selectedKeys={[filterStatus]}
                  onSelectionChange={(keys) => setFilterStatus(Array.from(keys)[0] as 'all' | 'En preparación' | 'Parcialmente ocupado' | 'En cultivación' | 'En mantenimiento')}
                  className="w-full sm:w-48"
                  placeholder="Filtrar por estado"
                >
                  <SelectItem key="all">Todos</SelectItem>
                  <SelectItem key="En preparación">En Preparación</SelectItem>
                  <SelectItem key="Parcialmente ocupado">Parcialmente Ocupado</SelectItem>
                  <SelectItem key="En cultivación">En Cultivación</SelectItem>
                  <SelectItem key="En mantenimiento">En Mantenimiento</SelectItem>
                </Select>
              </div>
            </CardHeader>

            <CardBody className="overflow-x-auto overflow-y-auto flex-grow">
              <Table aria-label="Tabla de lotes" className="min-w-full w-full">
                <TableHeader>
                   <TableColumn>Nombre</TableColumn>
                   <TableColumn className="hidden md:table-cell">Área (m²)</TableColumn>
                   <TableColumn>Estado</TableColumn>
                   <TableColumn className="hidden lg:table-cell">Ubicación</TableColumn>
                   <TableColumn>Acciones</TableColumn>
                 </TableHeader>
                <TableBody>
                  {currentLotes.map((lote) => (
                    <TableRow key={lote.id}>
                      <TableCell className="font-medium">{lote.nombre}</TableCell>
                      <TableCell className="hidden md:table-cell">{lote.area}</TableCell>
                      <TableCell>
                        <Chip
                          color={
                            lote.estado === 'En preparación' ? 'warning' :
                            lote.estado === 'Parcialmente ocupado' ? 'primary' :
                            lote.estado === 'En cultivación' ? 'success' :
                            lote.estado === 'En mantenimiento' ? 'danger' :
                            'default'
                          }
                          variant="flat"
                          size="sm"
                        >
                          {lote.estado}
                        </Chip>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Button
                          onClick={() => handleViewLocation(lote)}
                          color="primary"
                          variant="light"
                          size="sm"
                          startContent={<FaMapMarkerAlt />}
                        >
                          Ver
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => openModal(lote)}
                          color="primary"
                          variant="light"
                          size="sm"
                          isIconOnly
                        >
                          <FaEdit />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>

            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-2 pt-2 border-t flex-shrink-0">
                <span className="text-sm text-gray-500">
                  Mostrando {currentLotes.length} de {filteredLotes.length} lotes
                </span>
                <Pagination
                  total={totalPages}
                  page={currentPage}
                  onChange={setCurrentPage}
                  showControls
                  showShadow
                />
              </div>
            )}
          </Card>
        </div>
        
        <div className="w-full lg:flex-1 xl:flex-[2] flex flex-col gap-2 min-w-0 max-w-full">
          <h2 className="text-lg font-semibold text-gray-600 flex-shrink-0">Ubicación: <span className="text-green-700">{selectedLote ? selectedLote.nombre : 'General'}</span></h2>
          <div className="shadow-xl rounded-2xl flex-grow min-h-[400px] md:min-h-[500px]">
            <LotesMap
              lotes={lotes}
              selectedLote={selectedLote}
              onSelectLote={setSelectedLote}
              // 🔥 AQUÍ CONECTAMOS EL LISTENER
              onLotesUpdate={handleLotesUpdate}
            />
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onOpenChange={closeModal}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FaLeaf className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {editingLote ? 'Editar Lote' : 'Registrar Lote'}
              </h3>
              <p className="text-sm text-gray-600">Complete la información requerida</p>
            </div>
          </ModalHeader>
          <ModalBody>
            <LoteForm initialData={editingLote} onSave={handleSave} onCancel={closeModal} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}