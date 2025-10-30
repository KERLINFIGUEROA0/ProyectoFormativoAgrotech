import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import { listarDraculas, crearDracula, actualizarDracula, eliminarDracula } from '../api/draculaApi';
import Modal from '../../../components/Modal';
import DraculaForm from '../components/DraculaForm';
import type { Dracula, DraculaData } from '../interfaces/dracula';

export default function GestionDraculaPage(): ReactElement {
  const [draculas, setDraculas] = useState<Dracula[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: Dracula | null }>({ isOpen: false, item: null });
  const [editingDracula, setEditingDracula] = useState<Dracula | null>(null);

  const fetchData = async () => {
    try {
      const res = await listarDraculas();
      setDraculas(res.data || []);
    } catch (error) {
      toast.error("Error al cargar los draculas.");
    }
  };

  useEffect(() => { fetchData() }, []);

  const handleDelete = (dracula: Dracula) => {
    setDeleteModal({ isOpen: true, item: dracula });
  };

  const confirmDelete = async () => {
    if (!deleteModal.item) return;
    try {
      await eliminarDracula(deleteModal.item.id);
      toast.success("Dracula eliminado con éxito.");
      fetchData();
    } catch (error) {
      toast.error("Error al eliminar el dracula.");
    } finally {
      setDeleteModal({ isOpen: false, item: null });
    }
  };

  const handleSave = async (data: DraculaData) => {
    const toastId = toast.loading("Guardando dracula...");
    try {
      if (editingDracula) {
        await actualizarDracula(editingDracula.id, data);
        toast.success("Dracula actualizado con éxito.", { id: toastId });
      } else {
        await crearDracula(data);
        toast.success("Dracula creado con éxito.", { id: toastId });
      }
      closeModal();
      fetchData();
    } catch (error: any) {
      const errorMessage = Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error.response?.data?.message || "No se pudo guardar el dracula.";
      toast.error(errorMessage, { id: toastId });
    }
  };

  const openModal = (dracula: Dracula | null = null) => {
    setEditingDracula(dracula);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDracula(null);
  };

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 w-full flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-700">Gestión de Draculas</h1>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm text-sm hover:bg-green-700"
        >
          <FaPlus /> Nuevo Dracula
        </button>
      </div>

      <div className="overflow-auto flex-grow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Placa</th>
              <th className="px-4 py-3 text-left">Color</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {draculas.map((dracula, index) => (
              <tr key={dracula.id} className={`border-t transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 hover:shadow-sm`}>
                <td className="px-4 py-3">{dracula.id}</td>
                <td className="px-4 py-3 font-medium">{dracula.placa}</td>
                <td className="px-4 py-3">{dracula.color}</td>
                <td className="px-4 py-3 text-center flex justify-center gap-4">
                  <button
                    onClick={() => openModal(dracula)}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded p-1 transition-colors"
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(dracula)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                    title="Eliminar"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingDracula ? 'Editar Dracula' : 'Registrar Nuevo Dracula'}>
        <DraculaForm
          initialData={editingDracula || {}}
          onSave={handleSave}
          onCancel={closeModal}
        />
      </Modal>

      <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} title="Confirmar Eliminación">
        <p className="text-center mb-4">
          ¿Estás seguro de que quieres eliminar el dracula con placa "{deleteModal.item?.placa}"?
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setDeleteModal({ isOpen: false, item: null })}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={confirmDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
}