import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import type { Ficha, FichaForm } from '../interfaces/fichas';
import { getFichas, createFicha, updateFicha, deleteFicha } from '../api/fichas';
import FichaFormComponent from './FichaForm';
import Modal from '../../../components/Modal';

export default function GestionFichas(): ReactElement {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFicha, setEditingFicha] = useState<Ficha | null>(null);
  const [formData, setFormData] = useState<Partial<FichaForm>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fichaToDelete, setFichaToDelete] = useState<Ficha | null>(null);

  const loadFichas = async () => {
    try {
      setLoading(true);
      const data = await getFichas();
      setFichas(data);
    } catch (error) {
      toast.error('Error al cargar las fichas');
      console.error('Error loading fichas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFichas();
  }, []);

  const handleCreate = () => {
    setEditingFicha(null);
    setFormData({});
    setShowForm(true);
  };

  const handleEdit = (ficha: Ficha) => {
    setEditingFicha(ficha);
    setFormData({
      nombre: ficha.nombre,
      id_ficha: ficha.id_ficha,
    });
    setShowForm(true);
  };

  const handleDeleteClick = (ficha: Ficha) => {
    setFichaToDelete(ficha);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fichaToDelete) return;

    try {
      await deleteFicha(fichaToDelete.id);
      toast.success('Ficha eliminada exitosamente');
      loadFichas();
      setShowDeleteModal(false);
      setFichaToDelete(null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al eliminar la ficha';
      toast.error(errorMessage);
      console.error('Error deleting ficha:', error);
      // Cerrar el modal incluso con error para que el usuario pueda ver el mensaje completo
      setShowDeleteModal(false);
      setFichaToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setFichaToDelete(null);
  };

  const handleSave = async (data: FichaForm) => {
    try {
      if (editingFicha) {
        await updateFicha(editingFicha.id, data);
        toast.success('Ficha actualizada exitosamente');
      } else {
        await createFicha(data as any);
        toast.success('Ficha creada exitosamente');
      }
      setShowForm(false);
      loadFichas();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar la ficha');
      console.error('Error saving ficha:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingFicha(null);
    setFormData({});
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Fichas</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Crear Nueva Ficha
        </button>
      </div>

      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={handleCancel}
          title={editingFicha ? 'Editar Ficha' : 'Crear Nueva Ficha'}
        >
          <FichaFormComponent
            initialData={formData}
            onSave={handleSave}
            onCancel={handleCancel}
            editingId={editingFicha?.id || null}
          />
        </Modal>
      )}

      {showDeleteModal && fichaToDelete && (
        <Modal
          isOpen={showDeleteModal}
          onClose={handleDeleteCancel}
          title="Confirmar Eliminación"
        >
          <div className="p-4">
            <p className="text-gray-700 mb-4">
              ¿Está seguro de que desea eliminar la ficha <strong>"{fichaToDelete.nombre}"</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Código: {fichaToDelete.id_ficha}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {!showForm && !showDeleteModal && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código de Ficha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fichas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      No hay fichas registradas
                    </td>
                  </tr>
                ) : (
                  fichas.map((ficha) => (
                    <tr key={ficha.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ficha.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ficha.id_ficha}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                        <div className="flex justify-center items-center gap-3">
                          <button
                            onClick={() => handleEdit(ficha)}
                            className="text-blue-600 hover:text-blue-800 transition"
                            title="Editar ficha"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(ficha)}
                            className="text-red-600 hover:text-red-800 transition"
                            title="Eliminar ficha"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}