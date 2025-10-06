import { useState, useEffect, type ReactElement } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { FaPlus, FaLeaf, FaThList, FaTools, FaMapMarkerAlt, FaTrash, FaExclamationTriangle, FaEdit } from 'react-icons/fa';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { obtenerLotes, crearLote, actualizarLote, eliminarLote, actualizarEstadoLote, obtenerEstadisticasLotes } from '../api/lotesApi';
import Modal from '../../../components/Modal';
import LoteForm from '../components/LoteForm';
import LotesMap from '../components/LotesMap';
import type { Lote, LoteData, StatCardProps } from '../interfaces/cultivos';

// --- Componente StatCard (Sin cambios) ---
const StatCard = ({ icon, title, value, color }: StatCardProps): ReactElement => {
  const colors: { [key: string]: string } = {
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-100 text-red-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`p-3 rounded-full ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <p className="font-bold text-xl">{value}</p>
      </div>
    </div>
  );
};

export default function GestionLotesPage(): ReactElement {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [stats, setStats] = useState({ enCultivo: 0, total: 0, enPreparacion: 0 });
  const [filterStatus, setFilterStatus] = useState<'all' | 'Activo' | 'Inactivo' | 'En preparación'>('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingLote, setDeletingLote] = useState<Lote | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const location = useLocation(); 

    const fetchData = async () => {
    try {
      const [lotesResponse, statsResponse] = await Promise.all([obtenerLotes(), obtenerEstadisticasLotes()]);
      const fetchedLotes: Lote[] = lotesResponse.data || [];
      setLotes(fetchedLotes);
      setStats(statsResponse.data);
    } catch (error) {
      toast.error("Error al cargar los datos de los lotes.");
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [location]); 

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

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
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al guardar el lote.", { id: toastId });
    }
  };
  
  const handleEstadoChange = async (loteId: number, nuevoEstado: string) => {
    const toastId = toast.loading(`Cambiando estado a ${nuevoEstado}...`);
    try {
      await actualizarEstadoLote(loteId, nuevoEstado);
      toast.success("Estado actualizado.", { id: toastId });
      await fetchData();
    } catch (error) {
      toast.error("No se pudo actualizar el estado.", { id: toastId });
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
  
  const openDeleteModal = (lote: Lote) => {
    setDeletingLote(lote);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeletingLote(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deletingLote) return;
    const toastId = toast.loading("Eliminando lote...");
    try {
      await eliminarLote(deletingLote.id);
      toast.success("Lote eliminado con éxito.", { id: toastId });
      fetchData();
      closeDeleteModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al eliminar el lote.", { id: toastId });
    }
  };

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
    <div className="flex flex-col h-full space-y-6">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Lotes</h1>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow">
            <FaPlus /> Nuevo Lote
          </button>
        </div>
      </div>
      <div className="flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-600 mb-3">Información General de los Lotes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={<FaLeaf size={20}/>} title="En Cultivo" value={stats.enCultivo} color="blue" />
          <StatCard icon={<FaThList size={20}/>} title="Total Lotes" value={stats.total} color="green" />
          <StatCard icon={<FaTools size={20}/>} title="En Preparación" value={stats.enPreparacion} color="yellow" />
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6 flex-grow min-h-0">
        <div className="w-full lg:w-3/5 xl:w-2/3 flex flex-col">
          <div className="bg-white shadow-xl rounded-xl p-6 w-full h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-600">Lista de Lotes</h2>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="border border-gray-300 rounded-lg p-2 bg-white shadow-sm"
              >
                <option value="all">Todos</option>
                <option value="Activo">Activos</option>
                <option value="Inactivo">Inactivos</option>
                <option value="En preparación">En Preparación</option>
              </select>
            </div>
            
            <div className="overflow-y-auto flex-grow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Área (m²)</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Ubicación</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLotes.map((lote) => (
                    <tr key={lote.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{lote.nombre}</td>
                      <td className="px-4 py-3">{lote.area}</td>
                      {/* --- CORRECCIÓN DE ESTILO PARA INACTIVO --- */}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          lote.estado === 'Activo' ? 'bg-green-100 text-green-800' :
                          lote.estado === 'Inactivo' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {lote.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center"><button onClick={() => handleViewLocation(lote)} className="text-teal-600 hover:text-teal-800 font-medium flex items-center justify-center gap-1 mx-auto"><FaMapMarkerAlt /> Ver</button></td>
                      <td className="px-4 py-3 text-center flex justify-center items-center gap-4">
                        <button onClick={() => openModal(lote)} className="text-blue-600 hover:text-blue-800"><FaEdit /></button>
                        <button onClick={() => openDeleteModal(lote)} className="text-red-600 hover:text-red-800"><FaTrash /></button>
                        {/* --- CORRECCIÓN EN SELECTOR Y SU ESTILO --- */}
                        <select 
                          value={lote.estado} 
                          onChange={(e) => handleEstadoChange(lote.id, e.target.value)} 
                          className={`border text-xs rounded-lg p-1 shadow-sm ${
                            lote.estado === 'Activo' ? 'border-green-300 bg-green-50' :
                            lote.estado === 'Inactivo' ? 'border-gray-300 bg-gray-50' :
                            'border-yellow-300 bg-yellow-50'
                          }`}
                        >
                          <option value="Activo">Activo</option>
                          <option value="Inactivo">Inactivo</option>
                          <option value="En preparación">En preparación</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t flex-shrink-0">
                <span className="text-sm text-gray-500">
                  Mostrando {currentLotes.length} de {filteredLotes.length} lotes
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded-lg disabled:opacity-50"><ChevronLeft size={16} /></button>
                  <span className="text-sm font-semibold">Página {currentPage} de {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded-lg disabled:opacity-50"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full lg:w-2/5 xl:w-1/3 flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-gray-600 flex-shrink-0">Ubicación: <span className="text-green-700">{selectedLote ? selectedLote.nombre : 'General'}</span></h2>
          <div className="shadow-xl rounded-2xl flex-grow"> 
            <LotesMap lotes={lotes} selectedLote={selectedLote} onSelectLote={setSelectedLote} />
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingLote ? 'Editar Lote' : 'Registrar Lote'}><LoteForm initialData={editingLote} onSave={handleSave} onCancel={closeModal} /></Modal>
      {isDeleteModalOpen && deletingLote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 relative border border-gray-200 shadow-lg">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <FaExclamationTriangle className="text-red-600" size={24} />
              </div>
              <h4 className="text-lg font-semibold">¿Eliminar Lote?</h4>
              <div className="w-full bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm text-gray-700 font-bold">{deletingLote.nombre}</div>
              <p className="text-xs text-gray-500">Esta acción no se puede deshacer. Se eliminará permanentemente el lote.</p>
              <div className="flex gap-3 mt-4 w-full">
                <button onClick={closeDeleteModal} className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}