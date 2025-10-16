import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Bell, Edit, Trash2, FileText, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { listarMateriales, crearMaterial, actualizarMaterial, subirImagenMaterial, eliminarMaterial } from '../api/inventarioApi';
import Modal from '../../../components/Modal';
import MaterialForm from '../components/MaterialForm';
import type { Material, MaterialData } from '../interfaces/inventario';

const API_URL = import.meta.env.VITE_BACKEND_URL;

const getStatusColor = (cantidad: number) => {
  if (cantidad <= 10) return { text: 'Crítico', bg: 'bg-red-100', text_color: 'text-red-800' };
  if (cantidad <= 25) return { text: 'Stock Bajo', bg: 'bg-yellow-100', text_color: 'text-yellow-800' };
  return { text: 'Normal', bg: 'bg-green-100', text_color: 'text-green-800' };
};

export default function GestionInventarioPage() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const resMateriales = await listarMateriales();
      setMateriales(resMateriales.data || []);
    } catch (error) {
      toast.error("Error al cargar los materiales.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (material: Material | null = null) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMaterial(null);
  };

  // ✅ LÓGICA DE GUARDADO COMPLETADA
  const handleSave = async (data: MaterialData) => {
    const { imageFile, ...materialData } = data;
    const toastId = toast.loading("Guardando material...");

    try {
      let materialId: number;

      if (editingMaterial) {
        const res = await actualizarMaterial(editingMaterial.id, materialData);
        materialId = res.data.id;
        toast.success("Material actualizado con éxito.", { id: toastId });
      } else {
        const res = await crearMaterial(materialData);
        materialId = res.data.id;
        toast.success("Material creado con éxito.", { id: toastId });
      }

      if (imageFile && materialId) {
        await subirImagenMaterial(materialId, imageFile);
        toast.info("Imagen subida correctamente.");
      }

      fetchData();
      closeModal();
    } catch (error: any) {
      const errorMessage = Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error.response?.data?.message || "No se pudo guardar el material.";
      toast.error(errorMessage, { id: toastId });
    }
  };
  
  // ✅ LÓGICA DE ELIMINADO COMPLETADA
  const handleDelete = (id: number) => {
    toast.error("¿Estás seguro de que quieres eliminar este material?", {
      action: { label: 'Eliminar', onClick: async () => {
        const toastId = toast.loading("Eliminando...");
        try {
          await eliminarMaterial(id);
          toast.success("Material eliminado.", { id: toastId });
          fetchData();
        } catch {
          toast.error("No se pudo eliminar el material.", { id: toastId });
        }
      }},
      cancel: { label: 'Cancelar' },
    });
  };

  // ✅ CORRECCIÓN: Preparamos los datos para el formulario aquí
  const formInitialData = editingMaterial ? {
    ...editingMaterial,
    // Convertimos 'null' a 'undefined' para que coincida con el tipo esperado
    pesoPorUnidad: editingMaterial.pesoPorUnidad === null ? undefined : editingMaterial.pesoPorUnidad,
  } : {};

  return (
    <div className="p-2 sm:p-6 bg-gray-50 min-h-full font-sans">
      {/* ... (el resto del JSX no cambia) ... */}
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Gestión De Inventario</h1>
        {/* ... */}
      </header>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* ... */}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Producto</th>
                <th className="px-6 py-3 text-left font-medium">Categoría</th>
                <th className="px-6 py-3 text-left font-medium">Cantidad</th>
                <th className="px-6 py-3 text-left font-medium">Ubicación</th>
                <th className="px-6 py-3 text-left font-medium">Valor Unit.</th>
                <th className="px-6 py-3 text-left font-medium">Estado</th>
                <th className="px-6 py-3 text-left font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {materiales.map((mat) => {
                const status = getStatusColor(mat.cantidad);
                return (
                  <tr key={mat.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/stock/${mat.id}`)}>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <img
                        className="w-10 h-10 object-cover rounded-md"
                        src={mat.img ? `${API_URL}/uploads/${mat.img}` : 'https://via.placeholder.com/40'}
                        alt={mat.nombre}
                      />
                      <div>
                        <p className="font-semibold text-gray-800">{mat.nombre}</p>
                        <p className="text-xs text-gray-500">CÓDIGO: MAT-{String(mat.id).padStart(3, '0')}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">{mat.tipoMaterial}</span></td>
                    <td className="px-6 py-4 text-gray-700">{mat.cantidad} {mat.tipoMedida}</td>
                    <td className="px-6 py-4 text-gray-700">{mat.ubicacion}</td>
                    <td className="px-6 py-4 text-gray-700">${Number(mat.precio).toLocaleString('es-CO')}</td>
                    <td className="px-6 py-4"><span className={`text-xs font-bold px-2 py-1 rounded-full ${status.bg} ${status.text_color}`}>{status.text}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openModal(mat)} className="p-1.5 text-gray-500 hover:text-blue-600"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(mat.id)} className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Paginación y Acciones */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* ... */}
      </div>
        {/* --- ✅ SECCIÓN DE BOTONES SIMPLIFICADA --- */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
       
         <div className="flex flex-wrap gap-2">
            <button onClick={() => openModal()} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-orange-600 shadow-sm">
              <Plus size={16}/> Añadir Producto
            </button>
         </div>
      </div>
      {/* --- FIN DE LA CORRECCIÓN --- */}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingMaterial ? 'Editar Material' : 'Registrar Nuevo Material'}>
        {/* ✅ CORRECCIÓN: Pasamos el objeto ya transformado */}
        <MaterialForm initialData={formInitialData} onSave={handleSave} onCancel={closeModal} />
      </Modal>
    </div>
  );
}