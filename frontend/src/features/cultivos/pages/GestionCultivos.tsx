// src/features/cultivos/pages/GestionCultivos.tsx
import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
// --- 1. Importa la función para crear el tipo de cultivo ---
import { listarCultivos, crearCultivo, actualizarCultivo, eliminarCultivo, listarTiposCultivo, subirImagenCultivo, crearTipoCultivo } from '../api/cultivosApi';
import Modal from '../../../components/Modal';
import CultivoForm from '../components/CultivoForm';
import { useNavigate } from 'react-router-dom';
import type { Cultivo, TipoCultivo} from '../interfaces/cultivos';


export default function GestionCultivosPage(): ReactElement {
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [tiposCultivo, setTiposCultivo] = useState<TipoCultivo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCultivo, setEditingCultivo] = useState<Cultivo | null>(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [cultivosRes, tiposRes] = await Promise.all([
        listarCultivos(),
        listarTiposCultivo()
      ]);
      setCultivos(cultivosRes.data || []);
      setTiposCultivo(tiposRes.data || []);
    } catch (error) {
      toast.error("Error al cargar los datos de cultivos.");
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (cultivo: Cultivo | null = null) => {
    setEditingCultivo(cultivo);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCultivo(null);
  };

  // --- ✅ LÓGICA DE handleSave CORREGIDA ---
  const handleSave = async (data: any) => {
    const { imageFile, newTipoCultivoName, ...cultivoData } = data;
    const toastId = toast.loading("Guardando cultivo...");

    try {
      let finalCultivoData = { ...cultivoData };

      // Si el usuario escribió un nuevo tipo, lo creamos primero.
      if (newTipoCultivoName) {
        toast.info("Creando nuevo tipo de cultivo...", { id: toastId });
        const newTipoRes = await crearTipoCultivo({ nombre: newTipoCultivoName });
        // Usamos el ID del tipo recién creado.
        finalCultivoData.tipoCultivoId = newTipoRes.data.id;
      }

      if (editingCultivo) {
        // Lógica de Actualización
        const res = await actualizarCultivo(editingCultivo.id, finalCultivoData);
        if (imageFile) await subirImagenCultivo(res.data.id, imageFile);
        toast.success("Cultivo actualizado.", { id: toastId });
      } else {
        // Lógica de Creación
        const res = await crearCultivo(finalCultivoData);
        if (imageFile) await subirImagenCultivo(res.data.id, imageFile);
        toast.success("Cultivo creado.", { id: toastId });
      }
      
      await fetchData(); // Recarga todos los datos, incluyendo la nueva lista de tipos.
      closeModal();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Error al guardar el cultivo.";
      if (Array.isArray(errorMessage)) {
        toast.error(errorMessage.join('. '), { id: toastId });
      } else {
        toast.error(errorMessage, { id: toastId });
      }
    }
  };

  const handleDelete = (id: number) => {
    toast.warning('¿Estás seguro de que quieres eliminar este cultivo?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const toastId = toast.loading("Eliminando cultivo...");
          try {
            await eliminarCultivo(id);
            toast.success("Cultivo eliminado con éxito.", { id: toastId });
            await fetchData();
          } catch (error) {
            toast.error("No se pudo eliminar el cultivo.", { id: toastId });
          }
        }
      },
    cancel: { label: 'Cancelar', onClick: () => {} },
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Cultivos</h1>
        <div className="flex items-center gap-4">
          <input type="text" placeholder="Buscar..." className="border rounded-lg p-2" />
          <button onClick={() => openModal()} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700">
            <Plus /> Nuevo Cultivo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cultivos.map((cultivo) => (
          <div key={cultivo.id} className="bg-white rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
            <div className="relative">
              <img 
                className="w-full h-40 object-cover" 
                src={`${import.meta.env.VITE_BACKEND_URL}/uploads/${cultivo.img}`} 
                alt={cultivo.nombre} 
                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150'; }} 
              />
              <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-full text-white ${cultivo.Estado === 'Activo' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                {cultivo.Estado}
              </span>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-900">{cultivo.nombre}</h3>
              <p className="text-sm text-gray-600 mt-1 truncate">{cultivo.descripcion}</p>
              
              <div className="grid grid-cols-2 gap-x-4 mt-4 text-sm">
                  <div>
                      <p className="text-gray-500">Cantidad:</p>
                      <p className="font-semibold">{cultivo.cantidad} plantas</p>
                  </div>
                  <div>
                      <p className="text-gray-500">Tipo:</p>
                      <p className="font-semibold">{cultivo.tipoCultivo?.nombre}</p>
                  </div>
                  <div className="col-span-2 mt-2">
                      <p className="text-gray-500">Plantado:</p>
                      <p className="font-semibold">{new Date(cultivo.Fecha_Plantado).toLocaleDateString()}</p>
                  </div>
              </div>

              <div className="mt-5 pt-4 flex items-center justify-between">
                <div className="flex gap-2">
                    <button onClick={() => openModal(cultivo)} className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-800">
                      <Edit size={14} /> Editar
                    </button>
                    <button onClick={() => navigate(`/cultivos/${cultivo.id}/produccion`)} className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-800">
    <DollarSign size={14} /> Producción
</button>
                </div>
                <button onClick={() => handleDelete(cultivo.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCultivo ? 'Editar Cultivo' : 'Agregar Nuevo Cultivo'}>
        <CultivoForm
          initialData={editingCultivo ? { ...editingCultivo, tipoCultivoId: editingCultivo.tipoCultivo?.id } : {}}
          tiposCultivo={tiposCultivo}
          onSave={handleSave}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}