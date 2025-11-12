import { useState, useEffect } from 'react';
import { toast } from 'sonner';
// --- MODIFICACIÓN: Importar 'Eye' ---
import { Search, Loader2, Plus, Edit, Trash2, Eye } from 'lucide-react';
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

// --- MODIFICACIÓN: Añadir 'onViewDetails' a las props de EpaCard ---
const EpaCard = ({
  epa,
  onClick,
  onEdit,
  onDelete,
  onViewDetails, // <-- AÑADIR PROP
}: {
  epa: Epa;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onViewDetails: (e: React.MouseEvent) => void; // <-- AÑADIR PROP
}) => {
  const getLabelClass = (type: string) => {
    switch (type) {
      case 'Enfermedad':
        return 'bg-red-500';
      case 'Plaga':
        return 'bg-orange-500';
      case 'Arvense':
        return 'bg-green-600';
      default:
        return 'bg-gray-500';
    }
  };

  const imageUrl = epa.img
    ? `${import.meta.env.VITE_BACKEND_URL}/uploads/${epa.img}`
    : 'https://placehold.co/300x200';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 group cursor-pointer"
    >
      <div className="relative">
        <img
          className="w-full h-40 object-cover"
          src={imageUrl}
          alt={epa.nombre}
          onError={(e) => {
            e.currentTarget.src =
              'https://placehold.co/300x200/cccccc/ffffff?text=Imagen+no+disponible';
          }}
        />
        <span
          className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-full text-white ${getLabelClass(
            epa.tipoEnfermedad,
          )}`}
        >
          {epa.tipoEnfermedad}
        </span>

        {/* --- MODIFICACIÓN: Añadir botón de 'Ver Detalles' --- */}
        <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onViewDetails} // <-- AÑADIR BOTÓN
            className="p-2 bg-green-600 text-white rounded-full shadow-md hover:bg-green-700"
            title="Ver Detalles"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={onEdit}
            className="p-2 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700"
            title="Editar"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {/* --- FIN MODIFICACIÓN --- */}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 truncate">
          {epa.nombre}
        </h3>
        <p className="text-sm text-gray-600 mt-1 h-10">{epa.descripcion}</p>
      </div>
    </div>
  );
};

export default function GestionFitosanitarioPage() {
  const [allLocalEpas, setAllLocalEpas] = useState<Epa[]>([]);
  const [epasToShow, setEpasToShow] = useState<Epa[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todos');
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

  const confirmDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    toast.error('¿Estás seguro de que quieres eliminar esta EPA?', {
      action: {
        label: 'Eliminar',
        onClick: () => handleDelete(id),
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
    });
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

      {/* --- INICIO DE MODIFICACIÓN: Quitar filtro de cultivo --- */}
      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="relative md:col-span-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar por nombre (ej. Roya, Broca...)"
              className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              list="epa-sugerencias" // <-- AÑADIR LISTA DE DATOS
            />
            {/* --- AÑADIR DATALIST PARA AUTOCOMPLETE --- */}
            <datalist id="epa-sugerencias">
              {allLocalEpas.map((epa) => (
                <option key={epa.id} value={epa.nombre} />
              ))}
            </datalist>
            {/* --- FIN DE DATALIST --- */}
          </div>

          {/* --- SELECT DE CULTIVOS ELIMINADO --- */}

          <select
            className="w-full border border-gray-300 rounded-lg p-2 bg-white shadow-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="Todos">Todos los tipos</option>
            <option value="Enfermedad">Enfermedad</option>
            <option value="Plaga">Plaga</option>
            <option value="Arvense">Arvense</option>
            {/* --- OPCIÓN "Deficiencia" ELIMINADA --- */}
          </select>
        </div>
      </div>
      {/* --- FIN DE MODIFICACIÓN --- */}


      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-600">
          Resultados: {epasToShow.length} problemas encontrados
        </p>
      </div>

      {loadingLocal ? (
        <div className="text-center p-8 flex justify-center items-center gap-2">
          <Loader2 className="animate-spin" />
          Cargando catálogo...
        </div>
      ) : epasToShow.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          <p>No se encontraron resultados para tu búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {epasToShow.map((epa) => (
            <EpaCard
              key={epa.id}
              epa={epa}
              // onClick={() => handleCardClick(epa)}
              onEdit={(e) => {
                e.stopPropagation();
                handleOpenFormModal(epa);
              }}
              onDelete={(e) => confirmDelete(e, epa.id)}
              // --- AÑADIR HANDLER DEL NUEVO BOTÓN ---
              onViewDetails={(e) => {
                e.stopPropagation();
                handleOpenDetailModal(epa);
              }}
            />
          ))}
        </div>
      )}

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

      {/* Modal de Formulario (sin cambios) */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        title={editingEpa ? 'Editar EPA' : 'Registrar Nuevo EPA'}
      >
        <EpaForm
          initialData={editingEpa || {}}
          onSave={handleSave}
          onCancel={handleCloseFormModal}
        />
      </Modal>

      {/* --- AÑADIR NUEVO MODAL DE DETALLES --- */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        title="Detalles de la Amenaza"
      >
        {selectedEpaForDetail && (
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
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
        )}
      </Modal>
      {/* --- FIN DE NUEVO MODAL --- */}
    </div>
  );
}