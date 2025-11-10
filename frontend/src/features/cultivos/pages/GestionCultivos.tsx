// src/features/cultivos/pages/GestionCultivos.tsx
import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, DollarSign, BookCheck } from 'lucide-react'; // Trash2
import { listarCultivos, crearCultivo, actualizarCultivo, /*eliminarCultivo*/ listarTiposCultivo, subirImagenCultivo, crearTipoCultivo } from '../api/cultivosApi';
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

  const handleSave = async (data: any) => {
    const { imageFile, newTipoCultivoName, ...cultivoData } = data;
    const toastId = toast.loading("Guardando cultivo...");

    try {
      let finalCultivoData = { ...cultivoData };

      if (newTipoCultivoName) {
        toast.info("Creando nuevo tipo de cultivo...", { id: toastId });
        const newTipoRes = await crearTipoCultivo({ nombre: newTipoCultivoName });
        finalCultivoData.tipoCultivoId = newTipoRes.data.id;
      }

      if (editingCultivo) {
        const res = await actualizarCultivo(editingCultivo.id, finalCultivoData);
        if (imageFile) await subirImagenCultivo(res.data.id, imageFile);
        toast.success("Cultivo actualizado.", { id: toastId });
      } else {
        const res = await crearCultivo(finalCultivoData);
        if (imageFile) await subirImagenCultivo(res.data.id, imageFile);
        toast.success("Cultivo creado.", { id: toastId });
      }
      
      await fetchData();
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

  // const handleDelete = (id: number) => {
  //   toast.warning('¿Estás seguro de que quieres eliminar este cultivo?', {
  //     action: {
  //       label: 'Eliminar',
  //       onClick: async () => {
  //         const toastId = toast.loading("Eliminando cultivo...");
  //         try {
  //           await eliminarCultivo(id);
  //           toast.success("Cultivo eliminado con éxito.", { id: toastId });
  //           await fetchData();
  //         } catch (error) {
  //           toast.error("No se pudo eliminar el cultivo.", { id: toastId });
  //         }
  //       }
  //     },
  //   cancel: { label: 'Cancelar', onClick: () => {} },
  //   });
  // };

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

      {cultivos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay cultivos registrados</h3>
            <p className="text-gray-600 max-w-md">
              Registre aquí para gestionar tu producción agrícola de manera eficiente.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cultivos.map((cultivo) => (
            <div key={cultivo.id} className="bg-white rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 flex flex-col h-[450px]">
              <div className="relative w-full h-48">
                <img
                  className="w-full h-full object-cover"
                  src={`${import.meta.env.VITE_BACKEND_URL}/uploads/${cultivo.img}`}
                  alt={cultivo.nombre}
                  onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x160/cccccc/000000?text=Sin+Imagen'; }}
                />
                <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-full text-white ${cultivo.Estado === 'Activo' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                  {cultivo.Estado}
                </span>
              </div>
              <div className="p-4 flex flex-col h-full">
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

                {/* --- ✅ INICIO DE LA MODIFICACIÓN --- */}
                <div className="mt-auto p-3 border-t">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex-1 flex gap-1 min-w-0">
                      <button
                        onClick={() => navigate(`/cultivos/${cultivo.id}/produccion`)}
                        className="flex-1 flex items-center justify-center gap-1 bg-green-500 text-white px-2 py-1.5 rounded-lg text-xs sm:text-sm hover:bg-green-600 whitespace-nowrap min-w-0"
                      >
                        <DollarSign size={14} />
                        <span className="truncate">Producción</span>
                      </button>
                      <button
                        onClick={() => navigate(`/cultivos/${cultivo.id}/trazabilidad`)}
                        className="flex-1 flex items-center justify-center gap-1 bg-blue-500 text-white px-2 py-1.5 rounded-lg text-xs sm:text-sm hover:bg-blue-600 whitespace-nowrap min-w-0"
                      >
                        <BookCheck size={14} />
                        <span className="truncate">Trazabilidad</span>
                      </button>
                    </div>
                    <button
                      onClick={() => openModal(cultivo)}
                      className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-blue-500 hover:bg-blue-100 rounded-full"
                      title="Editar cultivo"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                </div>
                {/* --- ✅ FIN DE LA MODIFICACIÓN --- */}

              </div>
            </div>
          ))}
        </div>
      )}

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