import { useState, useEffect, type ReactElement, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Bell, Clock, AlertTriangle, LineChart as ChartIcon, Power, PowerOff, ChevronLeft, ChevronRight, BarChart3, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, AreaChart, Area
} from 'recharts';
import {
  listarSensores,
  crearSensor,
  actualizarSensor,
  eliminarSensor,
  getLatestSensorData,
  getSensorHistory,
  actualizarEstadoSensor,
} from '../api/sensoresApi';
import { obtenerSurcosPorLote } from '../../cultivos/api/surcosApi';
import { obtenerLotes } from '../../cultivos/api/lotesApi';
import Modal from '../../../components/Modal';
import SensorForm from '../components/SensorForm';
import type { Sensor, LatestSensorData, Surco } from '../interfaces/iot';
import type { Lote } from '../../cultivos/interfaces/cultivos';

type ChartData = {
  time: string;
  valor: number;
  fecha: string;
};

// --- Componente de Tarjeta de Sensor (SensorCard) ---
interface SensorCardProps {
  sensor: Sensor;
  latestData: LatestSensorData | undefined;
  onEdit: (sensor: Sensor) => void;
  onDelete: (id: number) => void;
  onViewHistory: (sensor: Sensor) => void;
  onToggleEstado: (id: number, estado: 'Activo' | 'Inactivo') => void;
}

function SensorCard({ sensor, latestData, onEdit, onDelete, onViewHistory, onToggleEstado }: SensorCardProps) {
  const valor = latestData ? latestData.valor : null;
  const min = sensor.valor_minimo_alerta;
  const max = sensor.valor_maximo_alerta;

  let valorColor = "text-gray-900";
  let alertMessage: string | null = null;
  let cardBorderColor = "border-transparent";

  if (valor !== null && !isNaN(Number(min)) && !isNaN(Number(max))) {
    if (valor < Number(min)) {
      valorColor = "text-yellow-600 animate-pulse";
      alertMessage = `¡Valor Bajo! (Mín: ${min})`;
      cardBorderColor = "border-yellow-500";
    } else if (valor > Number(max)) {
      valorColor = "text-red-600 animate-pulse";
      alertMessage = `¡Valor Alto! (Máx: ${max})`;
      cardBorderColor = "border-red-500";
    }
  }

  const isActive = sensor.estado === 'Activo';

  return (
    <div className={`bg-white shadow-xl rounded-xl p-6 relative transition-all border-4 ${cardBorderColor}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gray-100 rounded-full">
            <Bell className="w-8 h-8 text-gray-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-800">{sensor.nombre}</h3>
            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {sensor.estado}
            </span>
          </div>
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          <button 
            onClick={() => onToggleEstado(sensor.id, isActive ? 'Inactivo' : 'Activo')} 
            className={`${isActive ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
            title={isActive ? 'Desactivar' : 'Activar'}
          >
            {isActive ? <Power size={16} /> : <PowerOff size={16} />}
          </button>
          <button onClick={() => onViewHistory(sensor)} className="text-green-500 hover:text-green-700" title="Ver Gráficos">
            <ChartIcon size={16} />
          </button>
          <button onClick={() => onEdit(sensor)} className="text-blue-500 hover:text-blue-700" title="Editar">
            <Edit size={16} />
          </button>
          <button onClick={() => onDelete(sensor.id)} className="text-red-500 hover:text-red-700" title="Eliminar">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="my-6 text-center">
        {valor !== null ? (
          <p className={`text-6xl font-bold transition-colors ${valorColor}`}>
            {Number(valor).toFixed(1)}
          </p>
        ) : (
          <p className="text-4xl font-bold text-gray-400">N/A</p>
        )}
        {alertMessage && (
          <div className={`mt-2 flex items-center justify-center gap-2 font-semibold ${valorColor}`}>
            <AlertTriangle size={16} /> <span>{alertMessage}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center text-sm text-gray-500 border-t pt-3 mt-4">
        <Clock size={14} className="mr-2" />
        Última lectura:{' '}
        {latestData?.fechaRegistro ? (
          new Date(latestData.fechaRegistro).toLocaleTimeString('es-CO', {
            hour: '2-digit', minute: '2-digit', hour12: true
          })
        ) : (sensor.topic ? 'Esperando datos...' : 'Tópico no configurado')}
      </div>
    </div>
  );
}

// --- Componente de Carrusel de Gráficos Mejorado ---
interface SensorChartsCarouselProps {
  sensor: Sensor | null;
  onClose: () => void;
}

function SensorChartsCarousel({ sensor, onClose }: SensorChartsCarouselProps) {
  const [history, setHistory] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeChart, setActiveChart] = useState(0); // 0: Line, 1: Bar, 2: Area

  // Estadísticas - debe estar antes de cualquier return condicional
  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const valores = history.map(h => h.valor);
    return {
      promedio: valores.reduce((a, b) => a + b, 0) / valores.length,
      minimo: Math.min(...valores),
      maximo: Math.max(...valores),
      total: history.length,
    };
  }, [history]);

  useEffect(() => {
    if (!sensor) return;
    setLoading(true);
    getSensorHistory(sensor.id)
      .then(data => {
        const formattedHistory = (data || [])
          .sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime())
          .map(reading => ({
            time: new Date(reading.fechaRegistro).toLocaleTimeString('es-CO', {
              hour: '2-digit', minute: '2-digit'
            }),
            fecha: new Date(reading.fechaRegistro).toLocaleDateString('es-CO'),
            valor: parseFloat(String(reading.valor)),
          }));
        setHistory(formattedHistory);
      })
      .catch(() => toast.error("Error al cargar el historial del sensor."))
      .finally(() => setLoading(false));
  }, [sensor]);

  if (!sensor) return null;

  const color = "#3b82f6";
  const charts = [
    { name: 'Línea', icon: LineChart },
    { name: 'Barras', icon: BarChart3 },
    { name: 'Área', icon: TrendingUp },
  ];

  const renderChart = () => {
    if (loading) return <p className="text-center py-20">Cargando historial...</p>;
    if (history.length === 0) return <p className="text-center py-20">No hay historial de datos para este sensor.</p>;

    switch (activeChart) {
      case 0: // Line Chart
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}`, "Valor"]}
                labelFormatter={(label) => `Hora: ${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="valor" stroke={color} strokeWidth={3} dot={true} activeDot={{ r: 8 }} name={sensor.nombre} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 1: // Bar Chart
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}`, "Valor"]}
                labelFormatter={(label) => `Hora: ${label}`}
              />
              <Legend />
              <Bar dataKey="valor" fill={color} name={sensor.nombre} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 2: // Area Chart
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}`, "Valor"]}
                labelFormatter={(label) => `Hora: ${label}`}
              />
              <Legend />
              <Area type="monotone" dataKey="valor" stroke={color} fill={color} fillOpacity={0.3} name={sensor.nombre} />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={!!sensor} onClose={onClose} title={`Análisis de ${sensor.nombre}`}>
      <div className="p-4">
        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600">Promedio</p>
              <p className="text-2xl font-bold text-blue-600">{stats.promedio.toFixed(1)}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600">Mínimo</p>
              <p className="text-2xl font-bold text-green-600">{stats.minimo.toFixed(1)}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600">Máximo</p>
              <p className="text-2xl font-bold text-red-600">{stats.maximo.toFixed(1)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600">Total Lecturas</p>
              <p className="text-2xl font-bold text-purple-600">{stats.total}</p>
            </div>
          </div>
        )}

        {/* Selector de Gráficos */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => setActiveChart((prev) => (prev - 1 + charts.length) % charts.length)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            disabled={loading || history.length === 0}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex gap-2">
            {charts.map((chart, index) => {
              const Icon = chart.icon;
              return (
                <button
                  key={index}
                  onClick={() => setActiveChart(index)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeChart === index
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={loading || history.length === 0}
                >
                  <Icon size={16} />
                  <span>{chart.name}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setActiveChart((prev) => (prev + 1) % charts.length)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            disabled={loading || history.length === 0}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Gráfico */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          {renderChart()}
        </div>
      </div>
    </Modal>
  );
}

// --- Componente Principal (GestionSensoresPage) ---
export default function GestionSensoresPage(): ReactElement {
  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [latestData, setLatestData] = useState<LatestSensorData[]>([]);
  const [surcos, setSurcos] = useState<Surco[]>([]);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  
  const [historySensor, setHistorySensor] = useState<Sensor | null>(null);

  const fetchData = async () => {
    try {
      const [sensoresRes, lotesRes, latestDataRes] = await Promise.all([
        listarSensores(),
        obtenerLotes(),
        getLatestSensorData()
      ]);

      setSensores(sensoresRes.data || []);
      setLatestData(latestDataRes || []);

      const lotesData: Lote[] = lotesRes.data || [];
      
      const allSurcosPromises = lotesData.map((lote: Lote) => obtenerSurcosPorLote(lote.id));
      const allSurcosResponses = await Promise.all(allSurcosPromises);
      
      const allSurcos = allSurcosResponses.flatMap((res, index) => {
        const lote = lotesData[index];
        return (res?.data || []).map((s: any) => ({ 
          ...s, 
          lote: { id: lote.id, nombre: lote.nombre }
        }));
      });
      
      setSurcos(allSurcos);

    } catch (error) {
      toast.error("Error al cargar los datos de los sensores.");
      console.error("[Debug Inicial] Error en fetchData:", error);
    }
  };

  useEffect(() => {
    fetchData(); // Carga inicial
  }, []);

  // --- ✅ Lógica de Polling para datos en tiempo real ---
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchLatestData = async () => {
      try {
        const infoRes = await getLatestSensorData();
        setLatestData(infoRes || []);
      } catch (error) {
        console.error("Error al refrescar los datos del sensor:", error);
      }
    };

    // Solo activar el intervalo si los modales NO están abiertos
    if (!isFormModalOpen && !historySensor) {
      intervalId = setInterval(fetchLatestData, 5000); // Refresca cada 5 segundos
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isFormModalOpen, historySensor]);

  
  // Combinamos los sensores con sus últimos datos
  const sensoresConDatos = useMemo(() => {
    return sensores.map(sensor => {
      const datos = latestData.find(d => d.id === sensor.id);
      return {
        ...sensor,
        latestData: datos,
      };
    });
  }, [sensores, latestData]);


  // --- Lógica de Modales y CRUD ---
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
      await fetchData(); // Recarga todo
      closeFormModal();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Error al guardar el sensor.";
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg, { id: toastId });
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
            await fetchData(); // Recarga todo
          } catch (error) {
            toast.error("No se pudo eliminar el sensor.", { id: toastId });
          }
        }
      },
      cancel: { label: 'Cancelar', onClick: () => { } },
    });
  };

  const handleToggleEstado = async (id: number, nuevoEstado: 'Activo' | 'Inactivo') => {
    const toastId = toast.loading("Actualizando estado...");
    try {
      await actualizarEstadoSensor(id, nuevoEstado);
      toast.success(`Sensor ${nuevoEstado === 'Activo' ? 'activado' : 'desactivado'} correctamente.`, { id: toastId });
      await fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Error al actualizar el estado.";
      toast.error(msg, { id: toastId });
    }
  };

  const openFormModal = (sensor: Sensor | null = null) => {
    setEditingSensor(sensor);
    setIsFormModalOpen(true);
  };
  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingSensor(null);
  };
  
  const openHistoryModal = (sensor: Sensor) => {
    setHistorySensor(sensor);
  };
  const closeHistoryModal = () => {
    setHistorySensor(null);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Monitor de Sensores</h1>
        <button onClick={() => openFormModal()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow">
          <Plus /> Agregar Sensor
        </button>
      </div>

      {/* Sección de Tarjetas (Cuadrados) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sensoresConDatos.map(data => (
          <SensorCard
            key={data.id}
            sensor={data}
            latestData={data.latestData}
            onEdit={openFormModal}
            onDelete={handleDelete}
            onViewHistory={openHistoryModal}
            onToggleEstado={handleToggleEstado}
          />
        ))}
      </div>

      {/* Modal para agregar/editar */}
      <Modal isOpen={isFormModalOpen} onClose={closeFormModal} title={editingSensor ? 'Editar Sensor' : 'Agregar Nuevo Sensor'}>
        <SensorForm
          initialData={editingSensor || {}}
          surcos={surcos}
          onSave={handleSave}
          onCancel={closeFormModal}
        />
      </Modal>

      {/* Modal para ver gráficos con carrusel */}
      <SensorChartsCarousel
        sensor={historySensor}
        onClose={closeHistoryModal}
      />
    </div>
  );
}
