import { useState, useEffect, type ReactElement } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { FaPlus, FaLeaf, FaThList, FaTools, FaMapMarkerAlt, FaEdit } from 'react-icons/fa';
import { obtenerLotes, crearLote, actualizarLote, obtenerEstadisticasLotes } from '../api/lotesApi';
import FormModal from '../../../components/FormModal';
import LoteForm from '../components/LoteForm';
import LotesMap from '../components/LotesMap';
import type { Lote, LoteData, StatCardProps } from '../interfaces/cultivos';
import { Card, CardBody, CardHeader, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Select, SelectItem, Pagination } from '@heroui/react';

// --- Componente StatCard con Hero UI ---
const StatCard = ({ icon, title, value, color }: StatCardProps): ReactElement => {
  const colorMap = {
    blue: 'primary',
    red: 'danger',
    green: 'success',
    yellow: 'warning',
    success: 'success',
    danger: 'danger',
  } as const;
  return (
    <Card className="p-2">
      <CardBody className="flex flex-col items-center text-center py-1">
        <div className={`p-1.5 rounded-full bg-${colorMap[color]}-100 text-${colorMap[color]}-600 mb-1`}>
          {icon}
        </div>
        <p className="font-bold text-xl leading-tight mb-1">{value}</p>
        <p className="text-gray-500 text-xs leading-tight">{title}</p>
      </CardBody>
    </Card>
  );
};

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

    const fetchData = async () => {
    try {
      const [lotesResponse, statsResponse] = await Promise.all([obtenerLotes(), obtenerEstadisticasLotes()]);
      const fetchedLotes: Lote[] = lotesResponse.data || [];
      setLotes(fetchedLotes);
      setStats(statsResponse.data);
    } catch {
      toast.error("Error al cargar los datos de los lotes.");
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [location]); 

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
      let updatedLote;
      if (editingLote) {
        updatedLote = await actualizarLote(editingLote.id, data);
        toast.success("Lote actualizado con éxito.", { id: toastId });
      } else {
        updatedLote = await crearLote(data);
        toast.success("Lote creado con éxito.", { id: toastId });
      }
      await fetchData(); 
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
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Lotes</h1>
          <Button onClick={() => openModal()} color="primary" startContent={<FaPlus />}>
            Nuevo Lote
          </Button>
        </div>
      </div>
      <div className="flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-600 mb-3">Información General de los Lotes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={<FaThList size={20}/>} title="Total Lotes" value={stats.total} color="green" />
          <StatCard icon={<FaTools size={20}/>} title="En Preparación" value={stats.enPreparacion} color="yellow" />
          <StatCard icon={<FaLeaf size={20}/>} title="Parcialmente Ocupado" value={stats.parcialmenteOcupado} color="blue" />
          <StatCard icon={<FaLeaf size={20}/>} title="En Cultivo" value={stats.enCultivo} color="green" />
          <StatCard icon={<FaTools size={20}/>} title="En Mantenimiento" value={stats.enMantenimiento} color="red" />
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6 flex-grow min-h-0">
        <div className="w-full lg:w-3/5 xl:w-2/3 flex flex-col">
          <Card className="p-6 w-full h-full flex flex-col">
            <CardHeader className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-600">Lista de Lotes</h2>
              <Select
                selectedKeys={[filterStatus]}
                onSelectionChange={(keys) => setFilterStatus(Array.from(keys)[0] as 'all' | 'En preparación' | 'Parcialmente ocupado' | 'En cultivación' | 'En mantenimiento')}
                className="w-48"
                placeholder="Filtrar por estado"
              >
                <SelectItem key="all">Todos</SelectItem>
                <SelectItem key="En preparación">En Preparación</SelectItem>
                <SelectItem key="Parcialmente ocupado">Parcialmente Ocupado</SelectItem>
                <SelectItem key="En cultivación">En Cultivación</SelectItem>
                <SelectItem key="En mantenimiento">En Mantenimiento</SelectItem>
              </Select>
            </CardHeader>

            <CardBody className="overflow-y-auto flex-grow">
              <Table aria-label="Tabla de lotes">
                <TableHeader>
                  <TableColumn>Nombre</TableColumn>
                  <TableColumn>Área (m²)</TableColumn>
                  <TableColumn>Estado</TableColumn>
                  <TableColumn>Ubicación</TableColumn>
                  <TableColumn>Acciones</TableColumn>
                </TableHeader>
                <TableBody>
                  {currentLotes.map((lote) => (
                    <TableRow key={lote.id}>
                      <TableCell className="font-medium">{lote.nombre}</TableCell>
                      <TableCell>{lote.area}</TableCell>
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
                        >
                          {lote.estado}
                        </Chip>
                      </TableCell>
                      <TableCell>
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
              <div className="flex justify-between items-center mt-4 pt-4 border-t flex-shrink-0">
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
        
        <div className="w-full lg:w-2/5 xl:w-1/3 flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-gray-600 flex-shrink-0">Ubicación: <span className="text-green-700">{selectedLote ? selectedLote.nombre : 'General'}</span></h2>
          <div className="shadow-xl rounded-2xl flex-grow"> 
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

      <FormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingLote ? 'Editar Lote' : 'Registrar Lote'}
        icon={<FaLeaf className="h-6 w-6 text-green-600" />}
      >
        <LoteForm initialData={editingLote} onSave={handleSave} onCancel={closeModal} />
      </FormModal>
    </div>
  );
}