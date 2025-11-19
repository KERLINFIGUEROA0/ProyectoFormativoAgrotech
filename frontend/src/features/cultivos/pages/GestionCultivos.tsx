// src/features/cultivos/pages/GestionCultivos.tsx
import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, DollarSign, BookCheck, Leaf, Sprout, CheckCircle, Clock } from 'lucide-react'; // Trash2
import { listarCultivos, crearCultivo, actualizarCultivo, /*eliminarCultivo*/ listarTiposCultivo, subirImagenCultivo, crearTipoCultivo } from '../api/cultivosApi';
import { obtenerLotes } from '../api/lotesApi';
import { obtenerSurcosPorLote } from '../api/surcosApi';
import FormModal from '../../../components/FormModal';
import CultivoForm from '../components/CultivoForm';
import LotesMap from '../components/LotesMap';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader, Button } from '@heroui/react';
import type { Cultivo, TipoCultivo, Lote, Surco} from '../interfaces/cultivos';


// --- Componente StatCard con Hero UI ---
const StatCard = ({ icon, title, value, color }: { icon: ReactElement; title: string; value: number | string; color: 'blue' | 'red' | 'green' | 'yellow' }): ReactElement => {
  const colorMap = {
    blue: 'primary',
    red: 'danger',
    green: 'success',
    yellow: 'warning',
  } as const;
  return (
    <Card className="p-2">
      <CardBody className="flex flex-col items-center text-center py-1">
        <div className={`p-1.5 rounded-full bg-${colorMap[color]}-100 text-${colorMap[color]}-600 mb-1`}>
          {icon}
        </div>
        <p className="font-bold text-xl leading-tight mb-1">{value}</p>
        <p className="text-gray-500 text-xs leading-tight">{title}</p>
      </CardBody>
    </Card>
  );
};

export default function GestionCultivosPage(): ReactElement {
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [tiposCultivo, setTiposCultivo] = useState<TipoCultivo[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [surcos, setSurcos] = useState<Surco[]>([]);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [activeTab, setActiveTab] = useState<'lista' | 'mapa'>('lista');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCultivo, setEditingCultivo] = useState<Cultivo | null>(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [cultivosRes, tiposRes, lotesRes] = await Promise.all([
        listarCultivos(),
        listarTiposCultivo(),
        obtenerLotes()
      ]);
      setCultivos(cultivosRes.data || []);
      setTiposCultivo(tiposRes.data || []);
      setLotes(lotesRes.data || []);
      console.log('Lotes cargados:', lotesRes.data);
    } catch (error) {
      toast.error("Error al cargar los datos de cultivos.");
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calcular estadísticas
  const stats = {
    total: cultivos.length,
    activos: cultivos.filter(c => c.Estado === 'Activo').length,
    tipos: new Set(cultivos.map(c => c.tipoCultivo?.id)).size,
    totalPlantas: cultivos.reduce((sum, c) => sum + (c.cantidad || 0), 0)
  };

  const openModal = (cultivo: Cultivo | null = null) => {
    setEditingCultivo(cultivo);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCultivo(null);
  };

  const handleSelectLote = async (lote: Lote | null) => {
    setSelectedLote(lote);
    console.log('Lote seleccionado:', lote);
    if (lote) {
      try {
        const surcosRes = await obtenerSurcosPorLote(lote.id);
        console.log('Surcos obtenidos:', surcosRes.data);
        setSurcos(surcosRes.data || []);
      } catch (error) {
        toast.error("Error al cargar surcos del lote.");
        setSurcos([]);
        console.error('Error obteniendo surcos:', error);
      }
    } else {
      setSurcos([]);
    }
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
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Cultivos</h1>
          <Button onClick={() => openModal()} color="primary" startContent={<Plus />}>
            Nuevo Cultivo
          </Button>
        </div>
      </div>
      <div className="flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-600 mb-3">Información General de los Cultivos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Sprout size={20}/>} title="Total Cultivos" value={stats.total} color="green" />
          <StatCard icon={<CheckCircle size={20}/>} title="Cultivos Activos" value={stats.activos} color="blue" />
          <StatCard icon={<Leaf size={20}/>} title="Tipos de Cultivo" value={stats.tipos} color="yellow" />
          <StatCard icon={<Clock size={20}/>} title="Total Plantas" value={stats.totalPlantas} color="red" />
        </div>
      </div>

      <div className="flex-grow min-h-0">
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('lista')}
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'lista' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Lista de Cultivos
          </button>
          <button
            onClick={() => setActiveTab('mapa')}
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'mapa' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Mapa de Distribución de Cultivos
          </button>
        </div>

        {activeTab === 'lista' && (
          <Card className="p-6 w-full h-full flex flex-col">
            <CardHeader className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-600">Lista de Cultivos</h2>
            </CardHeader>

            <CardBody className="overflow-y-auto flex-grow">
              {cultivos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <Leaf className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay cultivos registrados</h3>
                    <p className="text-gray-600 max-w-md">
                      Registre aquí para gestionar tu producción agrícola de manera eficiente.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cultivos.map((cultivo) => (
                    <div key={cultivo.id} className="bg-white rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 flex flex-col min-h-[480px]">
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

                        <div className="mt-auto p-3 border-t">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/cultivos/${cultivo.id}/produccion`)}
                              className="flex-1 group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-2 py-2 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
                            >
                              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className="relative flex items-center justify-center gap-1">
                                <DollarSign size={14} className="animate-pulse" />
                                <span className="font-bold truncate">Producción</span>
                              </div>
                            </button>
                            <button
                              onClick={() => navigate(`/cultivos/${cultivo.id}/trazabilidad`)}
                              className="flex-1 group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-2 py-2 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
                            >
                              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className="relative flex items-center justify-center gap-1">
                                <BookCheck size={14} className="animate-pulse" />
                                <span className="font-bold truncate">Trazabilidad</span>
                              </div>
                            </button>
                            <button
                              onClick={() => openModal(cultivo)}
                              className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-110"
                              title="Editar cultivo"
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {activeTab === 'mapa' && (
          <Card className="p-6 w-full h-full flex flex-col">
            <CardHeader className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-600">Mapa de Distribución de Cultivos</h2>
            </CardHeader>
            <CardBody className="flex-grow">
              <LotesMap
                lotes={lotes}
                selectedLote={selectedLote}
                onSelectLote={handleSelectLote}
                customInfo={(lote) => (
                  <div className="p-2 max-w-xs">
                    <h4 className="font-bold text-lg text-gray-800 mb-2">
                      {lote.nombre}
                    </h4>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Área:</strong> {lote.area} m²
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Estado:</strong> {lote.estado}
                    </p>
                    <div className="border-t pt-2">
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        Surcos en este lote ({surcos.length}):
                      </p>
                      {surcos.length > 0 ? (
                        <ul className="text-sm text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                          {surcos.map((surco) => (
                            <li key={surco.id} className="flex justify-between items-center">
                              <span className="font-medium">{surco.nombre}:</span>
                              {surco.cultivo ? (
                                <button
                                  onClick={() => navigate(`/cultivos/${surco.cultivo!.id}/trazabilidad`)}
                                  className="text-green-600 hover:text-green-800 underline text-xs"
                                  title="Ver trazabilidad del cultivo"
                                >
                                  {surco.cultivo.nombre}
                                </button>
                              ) : (
                                <span className="text-red-600 text-xs italic">
                                  Sin cultivo asignado
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          No hay surcos registrados en este lote.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              />
            </CardBody>
          </Card>
        )}
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCultivo ? 'Editar Cultivo' : 'Agregar Nuevo Cultivo'}
        icon={<Leaf className="h-6 w-6 text-green-600" />}
        size="lg"
      >
        <CultivoForm
          initialData={editingCultivo ? { ...editingCultivo, tipoCultivoId: editingCultivo.tipoCultivo?.id } : {}}
          tiposCultivo={tiposCultivo}
          onSave={handleSave}
          onCancel={closeModal}
        />
      </FormModal>
    </div>
  );
}