import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, FileText, Plus, Search } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredFichas, setFilteredFichas] = useState<Ficha[]>([]);

  const loadFichas = async () => {
    try {
      setLoading(true);
      const data = await getFichas();
      const fichasWithCount = data.map(ficha => ({
        ...ficha,
        usuariosCount: ficha.usuarios?.length || 0
      }));
      setFichas(fichasWithCount);
      setFilteredFichas(fichasWithCount);
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

  useEffect(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const newFilteredFichas = fichas.filter(ficha =>
      ficha.nombre.toLowerCase().includes(lowercasedSearchTerm) ||
      ficha.id_ficha.toLowerCase().includes(lowercasedSearchTerm)
    );
    setFilteredFichas(newFilteredFichas);
  }, [searchTerm, fichas]);

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
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al eliminar la ficha';
      toast.error(errorMessage);
      console.error('Error deleting ficha:', error);
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
        await createFicha({
          nombre: data.nombre!,
          id_ficha: data.id_ficha!
        });
        toast.success('Ficha creada exitosamente');
      }
      setShowForm(false);
      loadFichas();
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar la ficha';
      toast.error(errorMessage);
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
    <div className="bg-white shadow-xl rounded-xl p-6 w-full h-full flex flex-col animate-in fade-in-0 duration-300">
      <div className="flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-700">Gestión de Fichas</h1>
            <p className="text-sm text-gray-500 mt-1">Administra las fichas de formación del sistema</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={16} /> Nueva Ficha
          </button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o código de ficha..."
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 relative border border-gray-200 shadow-lg">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="text-red-600" size={20} />
              </div>
              <h4 className="text-lg font-semibold">¿Eliminar ficha?</h4>
              <div className="w-full bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm text-gray-700">
                <div className="font-medium">{fichaToDelete.nombre}</div>
                <div className="text-xs text-gray-500 mt-1">Código: {fichaToDelete.id_ficha}</div>
              </div>
              <p className="text-xs text-gray-500">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3 mt-4 w-full">
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showForm && !showDeleteModal && (
        <div className="flex-grow overflow-x-auto relative rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-700 uppercase text-xs sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left font-semibold">Nombre de la Ficha</th>
                <th className="px-4 py-4 text-left font-semibold">Código de Ficha</th>
                <th className="px-4 py-4 text-center font-semibold">Usuarios Asignados</th>
                <th className="px-4 py-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFichas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="h-12 w-12 text-gray-400" />
                      <div className="text-gray-500">
                        {searchTerm ? 'No se encontraron fichas que coincidan con la búsqueda' : 'No hay fichas registradas'}
                      </div>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          Limpiar búsqueda
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFichas.map((ficha, index) => (
                  <tr key={ficha.id} className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                          <FileText size={16} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{ficha.nombre}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        {ficha.id_ficha}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        {ficha.usuariosCount || 0} usuarios
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(ficha)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="Editar ficha"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(ficha)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
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
      )}
    </div>
  );
}