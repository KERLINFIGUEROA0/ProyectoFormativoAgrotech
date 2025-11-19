import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Loader2, Plus, Edit, Trash2, Eye, UserPlus, X } from 'lucide-react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import {
  listarEpas,
  crearEpa,
  actualizarEpa,
  eliminarEpa,
  subirImagenEpa,
} from '../api/fitosanitarioApi';
import type { Epa, EpaData } from '../interfaces/fitosanitario';
import Modal from '../../../components/Modal';
import TratamientosRecomendadosModal from '../components/TratamientosRecomendadosModal';
import EpaForm from '../components/EpaForm';
import { Card, CardBody, CardHeader, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Select, SelectItem, Pagination } from '@heroui/react';


export default function GestionFitosanitarioPage() {
  const [allLocalEpas, setAllLocalEpas] = useState<Epa[]>([]);
  const [epasToShow, setEpasToShow] = useState<Epa[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isTratamientoModalOpen, setIsTratamientoModalOpen] = useState(false);
  const [selectedEpaForTreatments, setSelectedEpaForTreatments] =
    useState<Epa | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEpa, setEditingEpa] = useState<Epa | null>(null);

  // --- AÑADIR ESTADOS PARA EL NUEVO MODAL DE DETALLES ---
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEpaForDetail, setSelectedEpaForDetail] =
    useState<Epa | null>(null);
  // --- FIN DE NUEVOS ESTADOS ---

  // --- AÑADIR ESTADOS PARA MODAL DE ELIMINAR ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingEpa, setDeletingEpa] = useState<Epa | null>(null);
  // --- FIN DE ESTADOS PARA ELIMINAR ---

  const navigate = useNavigate();

  // Carga inicial de datos locales
  useEffect(() => {
    const fetchLocalData = async () => {
      try {
        setLoadingLocal(true);
        const data = await listarEpas();
        setAllLocalEpas(data || []);
      } catch (error) {
        toast.error('Error al cargar el catálogo local.');
      } finally {
        setLoadingLocal(false);
      }
    };
    fetchLocalData();
  }, []);

  // useEffect de búsqueda (solo filtra localmente)
  useEffect(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    const filtered = allLocalEpas.filter((epa) => {
      const filterByName = (epa.nombre ?? '')
        .toLowerCase()
        .includes(lowercasedSearchTerm);
      const filterByType =
        filterType === 'Todos' || epa.tipoEnfermedad === filterType;
      return filterByName && filterByType;
    });

    setEpasToShow(filtered);
  }, [searchTerm, allLocalEpas, filterType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEpas = epasToShow.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(epasToShow.length / itemsPerPage);

  const handleCardClick = (epa: Epa) => {
    setSelectedEpaForTreatments(epa);
    setIsTratamientoModalOpen(true);
  };

  const handleCloseTratamientoModal = () => {
    setIsTratamientoModalOpen(false);
    setSelectedEpaForTreatments(null);
  };

  const handleNavigateToPlanificar = () => {
    handleCloseTratamientoModal();
    navigate('/tratamientos', { state: { openNew: true } });
  };

  // --- Funciones CRUD (sin cambios) ---
  const handleOpenFormModal = (epa: Epa | null = null) => {
    setEditingEpa(epa);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setEditingEpa(null);
    setIsFormModalOpen(false);
  };

  const handleSave = async (data: EpaData) => {
    const { imageFile, ...epaData } = data;
    const toastId = toast.loading(
      editingEpa ? 'Actualizando EPA...' : 'Creando EPA...',
    );

    try {
      let epaGuardada: Epa;

      if (editingEpa) {
        epaGuardada = await actualizarEpa(editingEpa.id, epaData);
      } else {
        epaGuardada = await crearEpa(epaData);
      }

      if (imageFile) {
        toast.loading('Subiendo imagen...', { id: toastId });
        await subirImagenEpa(epaGuardada.id, imageFile);
      }

      toast.success('EPA guardada con éxito.', { id: toastId });
      handleCloseFormModal();
      await listarEpas().then((data) => setAllLocalEpas(data || [])); // Recargar datos
    } catch (error) {
      toast.error('Error al guardar la EPA.', { id: toastId });
    }
  };

  const handleDelete = async (id: number) => {
    const toastId = toast.loading('Eliminando EPA...');
    try {
      await eliminarEpa(id);
      toast.success('EPA eliminada.', { id: toastId });
      await listarEpas().then((data) => setAllLocalEpas(data || [])); // Recargar datos
    } catch {
      toast.error('No se pudo eliminar la EPA.', { id: toastId });
    }
  };

  const confirmDelete = (e: React.MouseEvent, epa: Epa) => {
    e.stopPropagation();
    setDeletingEpa(epa);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeletingEpa(null);
    setIsDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEpa) return;
    const toastId = toast.loading("Eliminando EPA...");
    try {
      await eliminarEpa(deletingEpa.id);
      toast.success("EPA eliminada con éxito.", { id: toastId });
      await listarEpas().then((data) => setAllLocalEpas(data || []));
      closeDeleteModal();
    } catch {
      toast.error("No se pudo eliminar la EPA.", { id: toastId });
    }
  };
  // --- FIN FUNCIONES CRUD ---

  // --- NUEVAS FUNCIONES PARA MODAL DE DETALLES ---
  const handleOpenDetailModal = (epa: Epa) => {
    setSelectedEpaForDetail(epa);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setSelectedEpaForDetail(null);
    setIsDetailModalOpen(false);
  };
  // --- FIN DE NUEVAS FUNCIONES ---

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">
          Gestión de Fitosanitario
        </h1>
        <button
          onClick={() => handleOpenFormModal()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow"
        >
          <Plus /> Nuevo EPA
        </button>
      </div>

      <Card className="p-6">
        <CardHeader className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-600">Lista de EPAs</h2>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre (ej. Roya, Broca...)"
                className="pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-48 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none bg-white appearance-none"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Enfermedad">Enfermedad</option>
              <option value="Plaga">Plaga</option>
              <option value="Arvense">Arvense</option>
            </select>
          </div>
        </CardHeader>


        <CardBody className="overflow-y-auto flex-grow">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Resultados: {epasToShow.length} problemas encontrados
            </p>
          </div>

          {loadingLocal ? (
            <div className="text-center p-8 flex justify-center items-center gap-2">
              <Loader2 className="animate-spin" />
              Cargando catálogo...
            </div>
          ) : currentEpas.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <p>No se encontraron resultados para tu búsqueda.</p>
            </div>
          ) : (
            <Table aria-label="Tabla de EPAs">
              <TableHeader>
                <TableColumn>Nombre</TableColumn>
                <TableColumn>Tipo</TableColumn>
                <TableColumn>Descripción</TableColumn>
                <TableColumn>Fecha</TableColumn>
                <TableColumn>Acciones</TableColumn>
              </TableHeader>
              <TableBody>
                {currentEpas.map((epa) => (
                  <TableRow key={epa.id}>
                    <TableCell className="font-medium">{epa.nombre}</TableCell>
                    <TableCell>
                      <Chip
                        color={
                          epa.tipoEnfermedad === 'Enfermedad' ? 'danger' :
                          epa.tipoEnfermedad === 'Plaga' ? 'warning' :
                          'success'
                        }
                        variant="flat"
                      >
                        {epa.tipoEnfermedad}
                      </Chip>
                    </TableCell>
                    <TableCell className="truncate max-w-xs" title={epa.descripcion}>
                      {epa.descripcion || 'Sin descripción'}
                    </TableCell>
                    <TableCell>{new Date(epa.fechaEncuentro || Date.now()).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetailModal(epa);
                          }}
                          color="primary"
                          variant="light"
                          size="sm"
                          isIconOnly
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFormModal(epa);
                          }}
                          color="primary"
                          variant="light"
                          size="sm"
                          isIconOnly
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          onClick={(e) => confirmDelete(e, epa)}
                          color="danger"
                          variant="light"
                          size="sm"
                          isIconOnly
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t flex-shrink-0">
            <span className="text-sm text-gray-500">
              Mostrando {Math.min(indexOfLastItem, epasToShow.length)} de {epasToShow.length} EPAs
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

      {/* Modal de Tratamientos (sin cambios) */}
      <Modal
        isOpen={isTratamientoModalOpen}
        onClose={handleCloseTratamientoModal}
        title=""
      >
        <TratamientosRecomendadosModal
          epa={selectedEpaForTreatments}
          onClose={handleCloseTratamientoModal}
          onPlanificar={handleNavigateToPlanificar}
        />
      </Modal>

      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-0 duration-500 ease-out">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingEpa ? "Actualizar EPA" : "Registrar Nuevo EPA"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Complete toda la información requerida
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseFormModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <EpaForm
                initialData={editingEpa || {}}
                onSave={handleSave}
                onCancel={handleCloseFormModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- AÑADIR NUEVO MODAL DE DETALLES --- */}
      {isDetailModalOpen && selectedEpaForDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-0 duration-500 ease-out">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Detalles de la Amenaza
                  </h3>
                  <p className="text-sm text-gray-600">
                    Información completa del EPA
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseDetailModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="space-y-4">
                <img
                  className="w-full h-48 object-cover rounded-lg border"
                  src={
                    selectedEpaForDetail.img
                      ? `${
                          import.meta.env.VITE_BACKEND_URL
                        }/uploads/${selectedEpaForDetail.img}`
                      : 'https://placehold.co/300x200'
                  }
                  alt={selectedEpaForDetail.nombre}
                />
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedEpaForDetail.nombre}
                </h2>
                <span
                  className={`text-sm font-semibold px-2 py-1 rounded-full ${
                    selectedEpaForDetail.tipoEnfermedad === 'Enfermedad'
                      ? 'bg-red-100 text-red-800'
                      : selectedEpaForDetail.tipoEnfermedad === 'Plaga'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {selectedEpaForDetail.tipoEnfermedad}
                </span>

                <div>
                  <h4 className="font-semibold text-gray-700">
                    Descripción de la Amenaza
                  </h4>
                  <p className="text-sm text-gray-600">
                    {selectedEpaForDetail.descripcion || 'No registrada.'}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700">
                    Posible Control o Tratamiento
                  </h4>
                  <p className="text-sm text-gray-600">
                    {selectedEpaForDetail.complicaciones || 'No registrado.'}
                  </p>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500">
                    Registrado el: {new Date(selectedEpaForDetail.fechaEncuentro || Date.now()).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- FIN DE NUEVO MODAL --- */}

      {/* --- MODAL DE ELIMINAR --- */}
      {isDeleteModalOpen && deletingEpa && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-0 duration-500 ease-out">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 relative border border-gray-200 shadow-lg animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <FaExclamationTriangle className="text-red-600" size={24} />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">¿Eliminar EPA?</h4>
              <div className="w-full bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm text-gray-700 font-bold text-center">{deletingEpa.nombre}</div>
              <p className="text-xs text-gray-500">
                Esta acción no se puede deshacer. Se eliminará permanentemente el EPA.
              </p>
              <div className="flex gap-3 mt-4 w-full">
                <button
                  onClick={closeDeleteModal}
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-gray-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- FIN MODAL DE ELIMINAR --- */}
    </div>
  );
}