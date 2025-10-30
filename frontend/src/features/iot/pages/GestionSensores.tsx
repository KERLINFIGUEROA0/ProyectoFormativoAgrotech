// src/features/iot/pages/GestionSensores.tsx
import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Bell, Thermometer, Droplet } from 'lucide-react';
import { listarSensores, crearSensor, actualizarSensor, eliminarSensor, listarTiposSensor } from '../api/sensoresApi';
import { obtenerSurcosPorLote } from '../../cultivos/api/surcosApi'; // Reutilizamos la API de surcos
import { obtenerLotes } from '../../cultivos/api/lotesApi';
import Modal from '../../../components/Modal';
import SensorForm from '../components/SensorForm';

// --- Interfaces ---
interface Sensor {
  id: number;
  nombre: string;
  estado: 'Activo' | 'Inactivo' | 'Mantenimiento';
  tipoSensor: { id: number, nombre: string };
  surco?: { id: number, nombre: string };
}

interface Lote {
  id: number;
  nombre: string;
}

interface Surco {
  id: number;
  nombre: string;
  loteId: number;
}

interface TipoSensor {
  id: number;
  nombre: string;
}


// --- Componente Principal ---
export default function GestionSensoresPage(): ReactElement {
  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [, setLotes] = useState<Lote[]>([]);
  const [surcos, setSurcos] = useState<Surco[]>([]);
  const [tiposSensor, setTiposSensor] = useState<TipoSensor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);

  const fetchData = async () => {
    try {
      const [sensoresRes, lotesRes, tiposRes] = await Promise.all([
        listarSensores(),
        obtenerLotes(),
        listarTiposSensor()
      ]);
      setSensores(sensoresRes.data || []);
      setLotes(lotesRes.data || []);
      setTiposSensor(tiposRes.data || []);

      // Cargar todos los surcos de todos los lotes para el formulario
      const allSurcosPromises = (lotesRes.data || []).map((lote: Lote) => obtenerSurcosPorLote(lote.id));
      const allSurcosResponses = await Promise.all(allSurcosPromises);
      const allSurcos = allSurcosResponses.flatMap(res => res?.data || []);
      setSurcos(allSurcos);

    } catch (error) {
      toast.error("Error al cargar los datos de los sensores.");
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (data: any) => {
    const toastId = toast.loading("Guardando sensor...");
    try {
      if (editingSensor) {
        await actualizarSensor(editingSensor.id, data);
        toast.success("Sensor actualizado con éxito.", { id: toastId });
      } else {
        await crearSensor(data);
        toast.success("Sensor creado con éxito.", { id: toastId });
      }
      await fetchData();
      closeModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al guardar el sensor.", { id: toastId });
    }
  };
  
  const handleDelete = (id: number) => {
    toast.warning('¿Estás seguro de que quieres eliminar este sensor?', {
      action: { 
        label: 'Eliminar', 
        onClick: async () => {
          const toastId = toast.loading("Eliminando sensor...");
          try {
            await eliminarSensor(id);
            toast.success("Sensor eliminado con éxito.", { id: toastId });
            await fetchData();
          } catch (error) {
            toast.error("No se pudo eliminar el sensor.", { id: toastId });
          }
        }
      },
      cancel: { 
        label: 'Cancelar',
        onClick: () => {}
      },
    });
  };

  const openModal = (sensor: Sensor | null = null) => {
    setEditingSensor(sensor);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSensor(null);
  };

  const getSensorIcon = (tipo: string) => {
    if (tipo.toLowerCase().includes('temperatura')) return <Thermometer className="text-orange-500" />;
    if (tipo.toLowerCase().includes('humedad')) return <Droplet className="text-blue-500" />;
    return <Bell className="text-gray-500" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Sensores</h1>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow">
          <Plus /> Agregar Sensor
        </button>
      </div>

      <div className="bg-white shadow-xl rounded-xl p-6 w-full">
        <h2 className="text-lg font-semibold text-gray-600 mb-4">Lista de Sensores</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Sensor</th>
                <th className="px-4 py-3 text-left">Última Lectura</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Alertas</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sensores.map((sensor) => (
                <tr key={sensor.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-md">
                        {getSensorIcon(sensor.tipoSensor.nombre)}
                    </div>
                    <div>
                        {sensor.nombre}
                        <p className="text-xs text-gray-500">ID: SNS{String(sensor.id).padStart(3, '0')}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">24°C</td> {/* Dato de ejemplo */}
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sensor.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {sensor.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-red-600">1</td> {/* Dato de ejemplo */}
                  <td className="px-4 py-3 text-center flex justify-center items-center gap-4">
                    <button onClick={() => openModal(sensor)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(sensor.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingSensor ? 'Editar Sensor' : 'Agregar Nuevo Sensor'}>
        <SensorForm 
            initialData={editingSensor ? {
                ...editingSensor,
                surcoId: (editingSensor as any).surco?.id,
                tipoSensorId: (editingSensor as any).tipoSensor?.id,
            } : {}}
            surcos={surcos}
            tiposSensor={tiposSensor}
            onSave={handleSave} 
            onCancel={closeModal} 
        />
      </Modal>
    </div>
  );
}