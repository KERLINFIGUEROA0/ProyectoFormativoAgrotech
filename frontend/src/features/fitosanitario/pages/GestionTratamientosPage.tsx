import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { listarTratamientos, crearTratamiento, actualizarTratamiento, eliminarTratamiento } from '../api/fitosanitarioApi';
import type { Tratamiento } from '../interfaces/fitosanitario';
import Modal from '../../../components/Modal';
import TratamientoForm from '../components/TratamientoForm';

export default function GestionTratamientosPage() {
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTratamiento, setEditingTratamiento] = useState<Partial<Tratamiento> | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await listarTratamientos();
      setTratamientos(data);
    } catch (error) {
      toast.error('Error al cargar los tratamientos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (tratamiento?: Tratamiento) => {
    setEditingTratamiento(tratamiento || {});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingTratamiento(null);
    setIsModalOpen(false);
  };

  const handleSave = async (data: Partial<Tratamiento>) => {
    const isEditing = !!data.id;
    const toastId = toast.loading(isEditing ? 'Actualizando tratamiento...' : 'Creando tratamiento...');
    try {
      if (isEditing) {
        await actualizarTratamiento(data.id!, data);
      } else {
        await crearTratamiento(data);
      }
      toast.success('Tratamiento guardado con éxito.', { id: toastId });
      fetchData();
      handleCloseModal();
    } catch (error) {
      toast.error('Error al guardar el tratamiento.', { id: toastId });
    }
  };

  const handleDelete = (id: number) => {
    toast.error('¿Estás seguro de que quieres eliminar este tratamiento?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await eliminarTratamiento(id);
            toast.success('Tratamiento eliminado.');
            fetchData();
          } catch {
            toast.error('No se pudo eliminar el tratamiento.');
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
    });
  };
  
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Finalizado': return 'bg-green-100 text-green-800';
      case 'En Curso': return 'bg-yellow-100 text-yellow-800';
      case 'Planificado': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center p-8">Cargando tratamientos...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Tratamientos</h1>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow">
          <Plus /> Planificar Tratamiento
        </button>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Tratamientos Registrados</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Fechas</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tratamientos.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">T{String(t.id).padStart(3, '0')}</td>
                  <td className="px-4 py-3">{t.descripcion}</td>
                  <td className="px-4 py-3">{t.tipo}</td>
                  <td className="px-4 py-3">{new Date(t.fechaInicio).toLocaleDateString()} - {t.fechaFinal ? new Date(t.fechaFinal).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(t.estado)}`}>
                      {t.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center flex justify-center items-center gap-4">
                    <button onClick={() => handleOpenModal(t)} className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingTratamiento?.id ? "Editar Tratamiento" : "Planificar Tratamiento"}>

         <TratamientoForm 
            initialData={editingTratamiento || {}} 
            onSave={handleSave} 
            onCancel={handleCloseModal} 
          />
      </Modal>
    </div>
  );
}