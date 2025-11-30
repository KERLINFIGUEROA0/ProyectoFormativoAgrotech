import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { listarTratamientos, crearTratamiento, actualizarTratamiento, eliminarTratamiento } from '../api/fitosanitarioApi';
import type { Tratamiento } from '../interfaces/fitosanitario';
import TratamientoForm from '../components/TratamientoForm';
import { listarCultivos } from '../../cultivos/api/cultivosApi';
import { useLocation } from 'react-router-dom';
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from '@heroui/react';

export default function GestionTratamientosPage() {
  const location = useLocation();
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
  const [cultivos, setCultivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTratamiento, setEditingTratamiento] = useState<Partial<Tratamiento> | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tratamientosData, cultivosData] = await Promise.all([
        listarTratamientos(),
        listarCultivos()
      ]);
      // Ensure treatments data is always an array
      setTratamientos(Array.isArray(tratamientosData) ? tratamientosData : []);
      setCultivos(cultivosData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error); // Log the actual error
      toast.error('Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const state = (location.state as any) || {};
    if (state.openNew) {
      setEditingTratamiento({});
      setIsModalOpen(true);
      try {
        const newState = { ...window.history.state };
        if (newState) {
          newState.usr = { ...(newState.usr || {}), openNew: false };
          window.history.replaceState(newState, '');
        }
      } catch (e) {
         console.warn("Could not modify history state:", e);
      }
    }
  }, [location.state]);

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

  const { cultivo, ...payloadBase } = data;
  const payload: Partial<Tratamiento> = { ...payloadBase };

  if (isEditing && 'id' in payload) { // Usar 'in' aquí también
    delete payload.id;
  }

  try {
    if (isEditing) {
      // data.id! asegura a TypeScript que id no será null aquí
      await actualizarTratamiento(data.id!, payload);
    } else {
      await crearTratamiento(payload);
    }
    toast.success('Tratamiento guardado con éxito.', { id: toastId });
    fetchData();
    handleCloseModal();
  } catch (error) {
    console.error("Error en API:", error); // Loguear el error completo

    // --- ✨ CORRECCIÓN LÍNEA 101: Asegurar que displayMessage sea string ---
    let displayMessage = 'Error al guardar el tratamiento.'; // Mensaje por defecto
    try {
        const apiError = error as any; // Casteo inicial
        const errorMessage = apiError?.response?.data?.message;

        if (Array.isArray(errorMessage)) {
            // Unir errores si es un array
            displayMessage = errorMessage.join('. ') || displayMessage;
        } else if (typeof errorMessage === 'string' && errorMessage.trim() !== '') {
            // Usar el mensaje si es un string no vacío
            displayMessage = errorMessage;
        } else if (apiError?.message) {
            // Usar el mensaje general del error Axios si existe
            displayMessage = apiError.message;
        }
    } catch (parseError) {
        console.error("Error parsing API error message:", parseError);
        // displayMessage se queda con el valor por defecto
    }
    toast.error(displayMessage, { id: toastId });
    // --- FIN CORRECCIÓN LÍNEA 101 ---
  }
};


  const handleDelete = (id: number) => {
    toast.error('¿Estás seguro de que quieres eliminar este tratamiento?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const toastId = toast.loading("Eliminando...");
          try {
            await eliminarTratamiento(id);
            toast.success('Tratamiento eliminado.', { id: toastId });
            fetchData();
          } catch {
            toast.error('No se pudo eliminar el tratamiento.', { id: toastId });
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
        <Button onClick={() => handleOpenModal()} color="success" startContent={<Plus />}>
          Planificar Tratamiento
        </Button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Tratamientos Registrados</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-left">Cultivo Afectado</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Fechas</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {/* Asegurarse que tratamientos es un array antes de mapear */}
              {Array.isArray(tratamientos) && tratamientos.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">T{String(t.id).padStart(3, '0')}</td>
                  <td className="px-4 py-3">{t.descripcion}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{t.cultivo?.nombre || 'General'}</td>
                  <td className="px-4 py-3">{t.tipo}</td>
                  {/* Verificar que las fechas sean válidas antes de formatear */}
                  <td className="px-4 py-3">
                    {t.fechaInicio ? new Date(t.fechaInicio).toLocaleDateString() : 'N/A'} - {t.fechaFinal ? new Date(t.fechaFinal).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(t.estado)}`}>
                      {t.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center flex justify-center items-center gap-4">
                    <Button onClick={() => handleOpenModal(t)} color="primary" variant="light" isIconOnly>
                      <Edit2 size={16} />
                    </Button>
                    <Button onClick={() => handleDelete(t.id)} color="danger" variant="light" isIconOnly>
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onOpenChange={handleCloseModal} size="4xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            {editingTratamiento?.id ? "Editar Tratamiento" : "Planificar Tratamiento"}
          </ModalHeader>
          <ModalBody>
            <TratamientoForm
              initialData={editingTratamiento || {}}
              onSave={handleSave}
              onCancel={handleCloseModal}
              cultivos={cultivos}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}