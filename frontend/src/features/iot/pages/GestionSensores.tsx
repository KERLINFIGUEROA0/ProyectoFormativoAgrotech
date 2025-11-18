import React, { useState, useEffect, type ReactElement, useMemo } from 'react';
import { toast } from 'sonner';
import {Bell, Clock, AlertTriangle, LineChart as ChartIcon, Power, PowerOff, ChevronLeft, ChevronRight, BarChart3, TrendingUp, MoreVertical } from 'lucide-react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'marquee': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

// Función helper para restar 5 horas a la fecha
const subtract5Hours = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  date.setHours(date.getHours() - 5);
  return date;
};
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, AreaChart, Area
} from 'recharts';
import {
  listarSensores,
  eliminarSensor,
  getLatestSensorData,
  getSensorHistory,
  actualizarEstadoSensor,
} from '../api/sensoresApi';
import { listarBrokers } from '../api/mqttConfigApi';
import Modal from '../../../components/Modal';
import BrokerFormModal from '../components/BrokerFormModal';
import type { Sensor, LatestSensorData } from '../interfaces/iot';
import { usePermissionGuard } from '../../../hooks/usePermissionGuard';

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
  menuOpen: string | null;
  onMenuToggle: (sensorId: string | null) => void;
}

function SensorCard({ sensor, latestData,onViewHistory, onToggleEstado, menuOpen, onMenuToggle }: SensorCardProps) {
  const rawValor = latestData ? latestData.valor : null;

  // Determinar unidad y convertir valor si es necesario
  const getDisplayData = (sensor: Sensor, valor: number | null) => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';

    if (name.includes('luz') || topic.includes('luz')) {
      // Convertir porcentaje a lux (0-100% -> 0-10000 lux)
      const luxValor = valor !== null ? valor * 100 : null;
      return { valor: luxValor, unit: 'lux' };
    } else if (name.includes('temperatura') || topic.includes('temperatura')) {
      return { valor, unit: '°C' };
    } else if ((name.includes('humedad') && name.includes('suelo')) || (topic.includes('humedad') && topic.includes('suelo'))) {
      return { valor, unit: '%' };
    } else if (name.includes('humedad') || topic.includes('humedad')) {
      return { valor, unit: '%' };
    }
    return { valor, unit: '' };
  };

  const { valor, unit } = getDisplayData(sensor, rawValor);
  const minRaw = sensor.valor_minimo_alerta;
  const maxRaw = sensor.valor_maximo_alerta;

  // Convertir min y max para display si es sensor de luz
  const convertAlertValue = (rawValue: number): number => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';
    if (name.includes('luz') || topic.includes('luz')) {
      return rawValue * 100;
    }
    return rawValue;
  };

  const min = convertAlertValue(minRaw);
  const max = convertAlertValue(maxRaw);

  let valorColor = "text-gray-900";
  let alertMessage: string | null = null;
  let cardBorderColor = "border-transparent";
  let bellColor = "text-gray-500";
  let bellAnimation = "";

  if (valor !== null && !isNaN(Number(min)) && !isNaN(Number(max))) {
    if (valor < Number(min)) {
      valorColor = "text-blue-600 animate-pulse";
      alertMessage = `PELIGRO`;
      cardBorderColor = "border-blue-500";
      bellColor = "text-blue-600";
      bellAnimation = "animate-bounce";
    } else if (valor > Number(max)) {
      valorColor = "text-red-600 animate-pulse";
      alertMessage = `PELIGRO`;
      cardBorderColor = "border-red-500";
      bellColor = "text-red-600";
      bellAnimation = "animate-bounce";
    }
  }

  const isActive = sensor.estado === 'Activo';

  return (
    <div className={`bg-gradient-to-br from-white to-gray-50 shadow-lg rounded-lg p-3 relative transition-all border-2 ${cardBorderColor} h-48 flex flex-col hover:shadow-xl`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 bg-gray-100 rounded-full ${bellAnimation}`}>
            <Bell className={`w-4 h-4 ${bellColor}`} />
          </div>
          <div className="min-w-0 flex-1" style={{ maxWidth: 'calc(100% - 50px)' }}>
            {React.createElement('marquee', { className: "font-semibold text-sm text-gray-800", behavior: "scroll", direction: "left", scrollamount: "2" }, sensor.nombre)}
            <span className={`px-1.5 py-0.5 inline-flex text-xs leading-4 font-medium rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {sensor.estado}
            </span>
          </div>
        </div>
        <div className="absolute top-2 right-2">
          <div className="relative sensor-menu">
            <button
              onClick={() => onMenuToggle(menuOpen === sensor.id.toString() ? null : sensor.id.toString())}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              title="Opciones"
            >
              <MoreVertical size={14} className="text-gray-600" />
            </button>

            {menuOpen === sensor.id.toString() && (
              <div className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-1 w-44 bg-white rounded-md shadow-lg border border-gray-200 z-10 sensor-menu">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onToggleEstado(sensor.id, isActive ? 'Inactivo' : 'Activo');
                      onMenuToggle(null);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {isActive ? <PowerOff size={12} /> : <Power size={12} />}
                    {isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => {
                      onViewHistory(sensor);
                      onMenuToggle(null);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <ChartIcon size={12} />
                    Ver Gráficos
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center my-2 text-center">
        {valor !== null ? (
          <div className={`text-3xl font-bold transition-colors ${valorColor} flex items-center justify-center gap-1`}>
            <span>{Number(valor).toFixed(1)}</span>
            {unit && <span className="text-lg font-normal">{unit}</span>}
          </div>
        ) : (
          <p className="text-2xl font-bold text-gray-400">N/A</p>
        )}
        {alertMessage && (
          <div className={`mt-1 flex items-center justify-center gap-1 font-semibold text-sm ${valorColor}`}>
            <AlertTriangle size={12} /> <span>{alertMessage}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center text-xs text-gray-500 border-t pt-2 mt-auto">
        <Clock size={12} className="mr-1" />
        Última:{' '}
        {latestData?.fechaRegistro ? (
          subtract5Hours(latestData.fechaRegistro)?.toLocaleTimeString('es-CO', {
            hour: '2-digit', minute: '2-digit', hour12: true
          })
        ) : (sensor.topic ? 'Esperando...' : 'Sin tópico')}
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
          .map(reading => {
            const adjustedDate = subtract5Hours(reading.fechaRegistro);
            return {
              time: adjustedDate?.toLocaleTimeString('es-CO', {
                hour: '2-digit', minute: '2-digit'
              }) || '',
              fecha: adjustedDate?.toLocaleDateString('es-CO') || '',
              valor: parseFloat(String(reading.valor)),
            };
          });
        setHistory(formattedHistory);
      })
      .catch(() => toast.error("Error al cargar el historial del sensor."))
      .finally(() => setLoading(false));
  }, [sensor]);

  // Polling para actualizar gráficas cada 5 segundos
  useEffect(() => {
    if (!sensor) return;

    const intervalId = setInterval(() => {
      getSensorHistory(sensor.id)
        .then(data => {
          const formattedHistory = (data || [])
            .sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime())
            .map(reading => {
              const adjustedDate = subtract5Hours(reading.fechaRegistro);
              return {
                time: adjustedDate?.toLocaleTimeString('es-CO', {
                  hour: '2-digit', minute: '2-digit'
                }) || '',
                fecha: adjustedDate?.toLocaleDateString('es-CO') || '',
                valor: parseFloat(String(reading.valor)),
              };
            });
          setHistory(formattedHistory);
        })
        .catch(() => {
          // Silenciar errores de polling para no molestar al usuario
          console.warn("Error al actualizar historial del sensor en polling.");
        });
    }, 5000); // Actualizar cada 5 segundos

    return () => clearInterval(intervalId);
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
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => Number(value).toFixed(1)} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}`, "Valor"]}
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
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => Number(value).toFixed(1)} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}`, "Valor"]}
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
              <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin', 'dataMax']} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => Number(value).toFixed(1)} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
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
    <Modal isOpen={!!sensor} onClose={onClose} title={`Análisis de ${sensor.nombre}`} size="4xl">
      <div className="p-4 max-h-[80vh] overflow-y-auto">
        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
  // Protección de permisos en tiempo real
  usePermissionGuard({ module: 'Iot' });

  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [latestData, setLatestData] = useState<LatestSensorData[]>([]);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const [historySensor, setHistorySensor] = useState<Sensor | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [generalHistory, setGeneralHistory] = useState<{time: string, [key: string]: number | string}[]>([]);

  const fetchData = async () => {
    try {
      const [sensoresRes, latestDataRes, brokersRes] = await Promise.all([
        listarSensores(),
        getLatestSensorData(),
        listarBrokers()
      ]);

      setSensores(sensoresRes.data || []);
      setLatestData(latestDataRes || []);

      // Actualizar historial general
      const newEntry: {time: string, [key: string]: number | string} = {
        time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      };
      (latestDataRes || []).forEach((d: LatestSensorData) => {
        if (d.valor != null) {
          newEntry[d.id.toString()] = d.valor;
        }
      });
      setGeneralHistory(prev => {
        const newHistory = [...prev, newEntry];
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });

      const brokers = brokersRes || [];
      if (brokers.length === 0) {
        setIsBrokerModalOpen(true);
      }

    } catch (error) {
      toast.error("Error al cargar los datos de los sensores.");
      console.error("[Debug Inicial] Error en fetchData:", error);
    }
  };

  useEffect(() => {
    fetchData(); // Carga inicial
  }, []);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && !(event.target as Element).closest('.sensor-menu')) {
        setMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // --- ✅ Lógica de Polling para datos en tiempo real ---
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;



    // Solo activar el intervalo si los modales NO están abiertos
    if (!isFormModalOpen && !historySensor) {
      intervalId = setInterval(() => {
        fetchData(); // Refresca sensores y datos cada 5 segundos
      }, 5000);
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

  const openFormModal = (_sensor: Sensor | null = null) => {
    setIsFormModalOpen(true);
  }
  
  const openHistoryModal = (sensor: Sensor) => {
    setHistorySensor(sensor);
  };
  const closeHistoryModal = () => {
    setHistorySensor(null);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Monitoreo de Sensores</h1>
        {/* Indicadores de colores en el header */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full border border-blue-300"></div>
            <span className="text-sm text-gray-700">Valor bajo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full border border-red-300"></div>
            <span className="text-sm text-gray-700">Valor alto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded-full border border-gray-300"></div>
            <span className="text-sm text-gray-700">Valor óptimo</span>
          </div>
        </div>
      </div>

      {/* Sección de Tarjetas (Cuadrados) con scroll horizontal */}
      <div className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50 backdrop-blur-sm rounded-3xl shadow-2xl border border-blue-200/50 p-8 hover:shadow-3xl transition-shadow duration-300">
        <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100 scrollbar-thumb-rounded-full">
          <div className="flex gap-6 min-w-max px-4">
            {sensoresConDatos.map(data => (
              <div key={data.id} className="flex-shrink-0 w-60 sm:w-64 transform hover:scale-105 transition-transform duration-200">
                <SensorCard
                  sensor={data}
                  latestData={data.latestData}
                  onEdit={openFormModal}
                  onDelete={handleDelete}
                  onViewHistory={openHistoryModal}
                  onToggleEstado={handleToggleEstado}
                  menuOpen={menuOpen}
                  onMenuToggle={setMenuOpen}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Indicadores de scroll si hay muchos sensores */}
        {sensoresConDatos.length > 4 && (
          <div className="flex justify-center mt-6 space-x-2">
            <div className="text-sm text-blue-600 bg-blue-100/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-blue-200/50 flex items-center gap-2">
              <ChevronLeft size={16} className="text-blue-500" />
              <span>Desliza para ver más sensores</span>
              <ChevronRight size={16} className="text-blue-500" />
            </div>
          </div>
        )}

        {/* Mensaje cuando no hay sensores */}
        {sensoresConDatos.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200/50">
              <p className="text-gray-600 text-xl font-medium">No hay sensores configurados</p>
              <p className="text-gray-500 text-sm mt-3">Registra un broker para crear sensores automáticamente</p>
            </div>
          </div>
        )}
      </div>

      {/* Gráfica de reporte general */}
      {sensoresConDatos.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Reporte General de Sensores en Tiempo Real</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={generalHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => Number(value).toFixed(1)} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
              <Tooltip formatter={(value) => [Number(value).toFixed(2), 'Valor']} />
              <Legend />
              {sensoresConDatos.map((sensor, index) => {
                const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff0000', '#0000ff'];
                return (
                  <Line
                    key={sensor.id}
                    type="monotone"
                    dataKey={sensor.id.toString()}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={false}
                    name={sensor.nombre}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Modal para ver gráficos con carrusel */}
      <SensorChartsCarousel
        sensor={historySensor}
        onClose={closeHistoryModal}
      />

      {/* Modal para registrar broker si no hay ninguno */}
      <BrokerFormModal
        isOpen={isBrokerModalOpen}
        onClose={() => setIsBrokerModalOpen(false)}
        onSuccess={async () => {
          setIsBrokerModalOpen(false);
          await fetchData();
          // Forzar actualización inmediata de datos de sensores
          try {
            const info = await getLatestSensorData();
            setLatestData(info || []);
          } catch (error) {
            console.error("Error al refrescar datos después de registrar broker:", error);
          }
        }}
        broker={null}
      />
    </div>
  );
}

