import React, { useState, useEffect, useMemo, type ReactElement } from 'react';
import { toast } from 'sonner';
import {
  Bell, Clock, AlertTriangle, LineChart as ChartIcon, Power, PowerOff,
  TrendingUp, MoreVertical, Filter, Sprout, Map, Layers,
  RefreshCw, Pause, Play, Download, X,
  ChevronLeft, ChevronRight, Server
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, AreaChart, Area
} from 'recharts';

// Hero UI Components
import { Select, SelectItem, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";

// --- APIS ---
import {
  listarSensores, eliminarSensor, getLatestSensorData, getSensorHistory, actualizarEstadoSensor, sincronizarSensoresLote
} from '../api/sensoresApi';
import { listarBrokers } from '../api/mqttConfigApi';
import { listarCultivos } from '../../cultivos/api/cultivosApi';
// Asegúrate de importar 'actualizarLote'
import { listarSurcos } from '../../cultivos/api/surcosApi';
import { obtenerLotes, actualizarLote } from '../../cultivos/api/lotesApi';

// --- COMPONENTES ---
import Modal from '../../../components/Modal';
import BrokerFormModal from '../components/BrokerFormModal';
  
// --- INTERFACES ---
import type { Sensor, LatestSensorData, Broker } from '../interfaces/iot';
import type { Cultivo, Surco, Lote } from '../../cultivos/interfaces/cultivos';
import { usePermissionGuard } from '../../../hooks/usePermissionGuard';

// --- TIPOS GLOBALES ---
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'marquee': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

type ChartData = {
  time: string;
  valor: number;
  fecha: string;
};

// --- HELPER FUNCTIONS ---
const subtract5Hours = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  date.setHours(date.getHours() - 5);
  return date;
};


// ==========================================
// COMPONENTE 2: TARJETA DE SENSOR (VISTA DETALLADA)
// ==========================================
interface SensorCardProps {
  sensor: Sensor;
  latestData: LatestSensorData | undefined;
  isSystemRecording: boolean; // Nuevo prop: Estado real del Surco
  onDelete: (id: number) => void;
  onViewHistory: (sensor: Sensor) => void;
  onToggleEstado: (id: number, estado: 'Activo' | 'Inactivo') => void;
  menuOpen: string | null;
  onMenuToggle: (sensorId: string | null) => void;
}

function SensorCard({ sensor, latestData, isSystemRecording, onViewHistory, onToggleEstado, menuOpen, onMenuToggle }: SensorCardProps) {
  const rawValor = latestData ? latestData.valor : null;

  const getDisplayData = (sensor: Sensor, valor: number | null) => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';
    if (name.includes('luz') || topic.includes('luz')) return { valor: valor !== null ? valor * 100 : null, unit: 'lux' };
    if (name.includes('temperatura') || topic.includes('temperatura')) return { valor, unit: '°C' };
    if (name.includes('humedad')) return { valor, unit: '%' };
    return { valor, unit: '' };
  };

  const { valor, unit } = getDisplayData(sensor, rawValor);
  const min = sensor.nombre.toLowerCase().includes('luz') ? sensor.valor_minimo_alerta * 100 : sensor.valor_minimo_alerta;
  const max = sensor.nombre.toLowerCase().includes('luz') ? sensor.valor_maximo_alerta * 100 : sensor.valor_maximo_alerta;

  let valorColor = "text-gray-900";
  let alertMessage: string | null = null;
  let cardBorderColor = "border-transparent";
  let bellAnimation = "";
  let bellColor = "text-gray-500";

  if (valor !== null) {
    if (valor < Number(min)) {
      valorColor = "text-blue-600 animate-pulse";
      alertMessage = "BAJO";
      cardBorderColor = "border-blue-500";
      bellColor = "text-blue-600";
      bellAnimation = "animate-bounce";
    } else if (valor > Number(max)) {
      valorColor = "text-red-600 animate-pulse";
      alertMessage = "ALTO";
      cardBorderColor = "border-red-500";
      bellColor = "text-red-600";
      bellAnimation = "animate-bounce";
    }
  }

  // Si el sistema NO está grabando, quitamos colores de alerta para indicar "congelado"
  if (!isSystemRecording && valor !== null) {
    valorColor = "text-gray-500";
    bellAnimation = "";
    alertMessage = null; 
  }

  const isActive = sensor.estado === 'Activo';

  return (
    <div className={`bg-gradient-to-br from-white to-gray-50 shadow-lg rounded-xl p-2 relative transition-all duration-300 border-2 ${cardBorderColor} flex flex-col hover:shadow-xl hover:scale-[1.02] h-[88px] overflow-hidden`}>
      {/* Decorative background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-50/20 to-transparent opacity-50"></div>

      {/* Content */}
      <div className="relative z-10">
      <div className="flex justify-between items-start mb-0.5">
        <div className="flex items-center gap-2 w-full pr-3">
          <div className={`p-1.5 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full shadow-sm border border-gray-300 ${bellAnimation}`}>
            <Bell className={`w-5 h-5 ${bellColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-800 text-[10px] truncate leading-tight" title={sensor.nombre}>{sensor.nombre}</h3>
            <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded-full inline-block shadow-sm ${isActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
              {isActive ? '● ACTIVO' : '● INACTIVO'}
            </span>
          </div>
        </div>
        
        <div className="absolute top-1.5 right-1.5">
          <button onClick={() => onMenuToggle(menuOpen === sensor.id.toString() ? null : sensor.id.toString())} className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
            <MoreVertical size={12} />
          </button>
          {menuOpen === sensor.id.toString() && (
            <div className="absolute right-0 mt-0.5 w-32 bg-white rounded shadow-lg border border-gray-100 z-20 py-0.5 text-xs animate-in fade-in zoom-in-95 duration-100">
              <button onClick={() => { onToggleEstado(sensor.id, isActive ? 'Inactivo' : 'Activo'); onMenuToggle(null); }} className="flex items-center gap-1.5 w-full px-3 py-1.5 text-gray-700 hover:bg-gray-50">
                {isActive ? <PowerOff size={11} /> : <Power size={11} />} {isActive ? 'OFF' : 'ON'}
              </button>
              <button onClick={() => { onViewHistory(sensor); onMenuToggle(null); }} className="flex items-center gap-1.5 w-full px-3 py-1.5 text-gray-700 hover:bg-gray-50">
                <ChartIcon size={11} /> Historial
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center py-0.5">
        {valor !== null ? (
          <>
            <div className={`text-xl font-bold ${valorColor} flex items-baseline gap-1 drop-shadow-sm`}>
              {Number(valor).toFixed(1)}
              <span className="text-[11px] font-semibold text-gray-500">{unit}</span>
            </div>

            {/* Indicador de estado - SIEMPRE visible para mantener altura consistente */}
            {!isSystemRecording ? (
                <div className="mt-0.5 text-[8px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shadow-sm">
                  <Pause size={7} className="inline mr-1" /> ⏸️ Congelado
                </div>
            ) : alertMessage ? (
                <div className={`mt-0.5 text-[8px] font-bold px-2 py-1 rounded-full border shadow-sm ${alertMessage === 'ALTO' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                  <AlertTriangle size={7} className="inline mr-1" /> ⚠️ {alertMessage}
                </div>
            ) : (
                <div className="mt-0.5 text-[8px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 shadow-sm">
                  <div className="inline mr-1 w-1.5 h-1.5 bg-green-500 rounded-full" /> ✅ Normal
                </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <span className="text-base font-bold text-gray-300">--</span>
            <p className="text-[8px] text-gray-400">Sin datos</p>
          </div>
        )}
      </div>

      <div className="pt-1 border-t border-gray-100 flex justify-center items-center text-[8px] text-gray-600 bg-gray-50/50 rounded-b-xl">
          <span className="flex items-center gap-1 font-medium"><Clock size={7} className="text-gray-400"/> {latestData?.fechaRegistro ? subtract5Hours(latestData.fechaRegistro)?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
      </div>

      </div>
    </div>
  );
}
// ==========================================
// COMPONENTE: CARRUSEL DE GRÁFICOS
// ==========================================
interface SensorChartsCarouselProps {
  sensor: Sensor | null;
  onClose: () => void;
}

function SensorChartsCarousel({ sensor, onClose }: SensorChartsCarouselProps) {
  const [history, setHistory] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sensor) return;
    setLoading(true);
    getSensorHistory(sensor.id).then(data => {
      const formatted = (data || []).sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime()).map(r => ({
        time: subtract5Hours(r.fechaRegistro)?.toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'}) || '',
        fecha: subtract5Hours(r.fechaRegistro)?.toLocaleDateString('es-CO') || '',
        valor: Number(r.valor),
      }));
      setHistory(formatted);
    }).catch(() => toast.error("Error cargando historial")).finally(() => setLoading(false));
  }, [sensor]);

  if (!sensor) return null;

  const renderChart = () => {
    if (loading) return <div className="h-64 flex items-center justify-center text-gray-400">Cargando datos...</div>;
    if (history.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No hay datos registrados</div>;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={history} margin={{ top: 15, right: 20, left: 15, bottom: 70 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="time"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            angle={-45}
            textAnchor="end"
            height={45}
          />
          <YAxis
            fontSize={10}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
            tickFormatter={(value) => {
              const num = Number(value);
              if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
              if (num % 1 === 0) return num.toString();
              return num.toFixed(2);
            }}
            width={45}
          />
          <Tooltip />
          <Legend
            wrapperStyle={{
              fontSize: '11px',
              paddingTop: '10px'
            }}
            iconType="line"
            verticalAlign="bottom"
            height={36}
          />
          <Line
            type="monotone"
            dataKey="valor"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              stroke: '#3b82f6',
              strokeWidth: 2,
              fill: '#fff',
              style: { filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.2))' }
            }}
            name={sensor.nombre}
            isAnimationActive={true}
            animationDuration={800}
            connectNulls={true}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Modal isOpen={!!sensor} onClose={onClose} title={`Historial: ${sensor.nombre}`} size="4xl">
      <div className="p-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4">{renderChart()}</div>
      </div>
    </Modal>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function GestionSensoresPage(): ReactElement {
  // Protección de permisos en tiempo real
  usePermissionGuard({ module: 'Iot' });

  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [latestData, setLatestData] = useState<LatestSensorData[]>([]);
  
  // Estados de Filtros
  const [modoVista, setModoVista] = useState<'GENERAL' | 'CULTIVO' | 'LOTE'>('GENERAL');
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [surcos, setSurcos] = useState<Surco[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [filtroId, setFiltroId] = useState<number | 'TODOS'>('TODOS');
  const [surcoSeleccionado, setSurcoSeleccionado] = useState<number | 'TODOS'>('TODOS');

  // Modales y UI
  const [historySensor, setHistorySensor] = useState<Sensor | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [sensorHistories, setSensorHistories] = useState<{ [sensorId: number]: ChartData[] }>({});
  const [sensoresGrafica, setSensoresGrafica] = useState<number[]>([]);
  const [paginaSensores, setPaginaSensores] = useState(0);
  const tarjetasPorPagina = 4;

  // 1. CARGA DE ESTRUCTURA
  const loadStructure = async () => {
    try {
      const [sensoresRes, brokersRes, cultivosRes, surcosRes, lotesRes] = await Promise.all([
        listarSensores(),
        listarBrokers(),
        listarCultivos(),
        listarSurcos(),
        obtenerLotes()
      ]);
      setSensores(sensoresRes.data || []);
      setCultivos(cultivosRes.data || []);
      setSurcos(surcosRes.data || []);
      setLotes(lotesRes.data || []);

      // Si no hay brokers, abrir automáticamente el modal para crear uno
      if (!brokersRes || brokersRes.length === 0) {
        setIsBrokerModalOpen(true);
      }
    } catch (error) {
      console.error("Error cargando estructura", error);
    }
  };

  useEffect(() => { loadStructure(); }, []);

  // --- LOGICA DE CONTROL (Backend) ---

  // Detectar estado actual del lote seleccionado
  const currentLote = useMemo(() => {
    if (modoVista === 'LOTE' && filtroId !== 'TODOS') {
      return lotes.find(l => l.id === filtroId);
    }
    return null;
  }, [lotes, filtroId, modoVista]);

  // Estado REAL de grabación (viene de la BD)
  const isSystemRecording = (currentLote as any)?.activo_mqtt !== false; // Default true

  // 2. CARGA DE DATOS (Siempre consulta, el backend decide si hay datos nuevos o no)
  const fetchData = async () => {
    // Si estamos viendo historial, no consumimos API de datos innecesariamente
    if (historySensor) return;

    try {
      const datos = await getLatestSensorData();
      setLatestData(datos || []);

      // Load histories for filtered sensors
      if (sensoresFiltrados.length > 0) {
        const currentSensorIds = Object.keys(sensorHistories).map(Number);
        const newSensorIds = sensoresFiltrados.map(s => s.id).filter(id => !currentSensorIds.includes(id));

        if (newSensorIds.length > 0) {
          const promises = newSensorIds.map(sensorId =>
            getSensorHistory(sensorId).then(data => {
              const formatted = (data || []).sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime()).slice(-10).map(r => ({
                time: subtract5Hours(r.fechaRegistro)?.toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'}) || '',
                valor: Number(r.valor),
                fecha: subtract5Hours(r.fechaRegistro)?.toLocaleDateString('es-CO') || '',
              }));
              return { sensorId, history: formatted };
            })
          );
          Promise.all(promises).then(results => {
            setSensorHistories(prev => {
              const newHistories = { ...prev };
              results.forEach(({ sensorId, history }) => {
                newHistories[sensorId] = history;
              });
              return newHistories;
            });
          }).catch(() => toast.error("Error cargando historial"));
        }
      }
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  // POLLING CONSTANTE (Cada 3s para mejor respuesta)
  useEffect(() => {
    // Consultamos siempre, porque aunque el lote esté pausado en Backend,
    // queremos ver el último dato que quedó guardado (congelado).
    fetchData(); // Carga inicial al montar o cambiar filtro

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [filtroId, surcoSeleccionado, historySensor]);

  // Cierre menú
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => { if (menuOpen && !(e.target as Element).closest('button')) setMenuOpen(null); };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, [menuOpen]);

  // Cargar historiales para sensores seleccionados en gráfica
  useEffect(() => {
    if (sensoresGrafica.length > 0) {
      const sensoresSinHistorial = sensoresGrafica.filter(id => !sensorHistories[id]);
      if (sensoresSinHistorial.length > 0) {
        const promises = sensoresSinHistorial.map(sensorId =>
          getSensorHistory(sensorId).then(data => {
            const formatted = (data || []).sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime()).slice(-10).map(r => ({
              time: subtract5Hours(r.fechaRegistro)?.toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'}) || '',
              valor: Number(r.valor),
              fecha: subtract5Hours(r.fechaRegistro)?.toLocaleDateString('es-CO') || '',
            }));
            return { sensorId, history: formatted };
          })
        );
        Promise.all(promises).then(results => {
          setSensorHistories(prev => {
            const newHistories = { ...prev };
            results.forEach(({ sensorId, history }) => {
              newHistories[sensorId] = history;
            });
            return newHistories;
          });
        }).catch(() => toast.error("Error cargando historial de sensor"));
      }
    }
  }, [sensoresGrafica]);

  const toggleSystemRecording = async () => {
    if (!currentLote) return;

    const newState = !isSystemRecording;
    const toastId = toast.loading(newState ? "Activando grabación de datos..." : "Pausando grabación de datos...");

    try {
      // Llamada al Backend para cambiar el estado REAL del lote
      await actualizarLote(currentLote.id, { activo_mqtt: newState } as any);

      toast.success(newState ? "✅ Lote activo: Recibiendo datos." : "⏸️ Lote pausado: Datos congelados.", { id: toastId });

      // Recargamos la estructura para actualizar el objeto 'lote' localmente
      loadStructure();
      if (newState) setSensorHistories({}); // Reload histories when resuming
    } catch (error) {
      toast.error("Error al cambiar estado del lote", { id: toastId });
    }
  };

  // Handlers UI
  const handleModoChange = (modo: 'GENERAL' | 'CULTIVO' | 'LOTE') => {
    setModoVista(modo);
    setFiltroId('TODOS');
    setSurcoSeleccionado('TODOS');
    setSensoresGrafica([]);
    setLatestData([]);
    setSensorHistories({});
    setPaginaSensores(0); // Resetear página
  };

  const openBrokerModal = (broker: Broker | null = null) => {
    setEditingBroker(broker);
    setIsBrokerModalOpen(true);
  };

  const closeBrokerModal = () => {
    setIsBrokerModalOpen(false);
    setEditingBroker(null);
  };

  const selectBrokerForEdit = (broker: Broker) => {
    setEditingBroker(broker);
  };

  const createNewBroker = () => {
    setEditingBroker(null);
  };

  const handleSincronizar = async (loteId: number) => {
    const toastId = toast.loading(`Sincronizando sensores...`);
    try {
      const res = await sincronizarSensoresLote(loteId);
      if (res.sensoresCreados > 0) {
        toast.success(res.message, { id: toastId });
        loadStructure();
      } else {
        toast.info("Sensores al día", { id: toastId });
      }
    } catch (error: any) {
      toast.error("Error al sincronizar", { id: toastId });
    }
  };

  const handleToggleEstadoSensor = async (id: number, estado: 'Activo' | 'Inactivo') => {
    try {
      await actualizarEstadoSensor(id, estado);
      toast.success(`Sensor ${estado}`);
      loadStructure(); 
    } catch (error) {
      toast.error("Error al cambiar estado");
    }
  };

  // Filtrado de datos para render (Siempre sensores con datos)
  const sensoresFiltrados = useMemo(() => {
    let res = sensores.map(s => ({ ...s, latestData: latestData.find(d => d.id === s.id) }));

    if (modoVista === 'GENERAL') {
      // En modo general, permitir filtrar por lote
      if (filtroId !== 'TODOS') {
        res = res.filter(s => s.lote?.id === filtroId || s.surco?.lote?.id === filtroId);
      }
      return res;
    }

    if (modoVista === 'CULTIVO') {
      // Mostrar sensores de lotes que tienen el cultivo O sensores de surcos del cultivo
      const lotesConCultivo = new Set(surcos.filter(s => s.cultivo?.id === filtroId).map(s => s.lote.id));
      res = res.filter(s => lotesConCultivo.has(s.lote?.id) || s.surco?.cultivo?.id === filtroId);
    }
    if (modoVista === 'LOTE') {
      // Mostrar solo sensores asociados directamente al lote (creados por sincronización)
      res = res.filter(s => s.lote?.id === filtroId);
      if (surcoSeleccionado !== 'TODOS') {
        res = res.filter(s => s.surco?.id === surcoSeleccionado);
      }
    }

    return res;
  }, [sensores, latestData, modoVista, filtroId, surcoSeleccionado, surcos]);

  // Cálculo de sensores para la página actual
  const sensoresPaginaActual = useMemo(() => {
    const inicio = paginaSensores * tarjetasPorPagina;
    const fin = inicio + tarjetasPorPagina;
    return sensoresFiltrados.slice(inicio, fin);
  }, [sensoresFiltrados, paginaSensores, tarjetasPorPagina]);

  // Total de páginas
  const totalPaginas = Math.ceil(sensoresFiltrados.length / tarjetasPorPagina);


  // Funciones de navegación
  const paginaAnterior = () => {
    setPaginaSensores(prev => Math.max(0, prev - 1));
  };

  const paginaSiguiente = () => {
    setPaginaSensores(prev => Math.min(totalPaginas - 1, prev + 1));
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col p-3 md:p-4 max-w-full mx-auto gap-4">

      {/* HEADER COMPACTO */}
      <div className="flex-shrink-0 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between gap-4">
          {/* FILTROS PRINCIPALES */}
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {[
                { id: 'GENERAL', icon: Layers, label: 'General', color: 'primary' },
                { id: 'CULTIVO', icon: Sprout, label: 'Cultivo', color: 'success' },
                { id: 'LOTE', icon: Map, label: 'Lote', color: 'warning' }
              ].map((m) => (
                <Button
                  key={m.id}
                  onClick={() => handleModoChange(m.id as any)}
                  variant={modoVista === m.id ? "solid" : "light"}
                  color={m.color as any}
                  size="sm"
                  className={`text-xs font-medium transition-all ${
                    modoVista === m.id
                      ? 'shadow-md'
                      : 'hover:shadow-sm'
                  }`}
                  startContent={<m.icon size={14} />}
                >
                  {m.label}
                </Button>
              ))}
            </div>

            {/* SELECTS DE FILTRO */}
            {modoVista !== 'GENERAL' && (
              <div className="flex items-center gap-2">
                <Select
                  selectedKeys={filtroId === 'TODOS' ? [] : [filtroId.toString()]}
                  onSelectionChange={(keys) => {
                      const selected = Array.from(keys);
                      const value = selected.length > 0 ? selected[0] : 'TODOS';
                      setFiltroId(value === 'TODOS' ? 'TODOS' : Number(value));
                      setSurcoSeleccionado('TODOS');
                      setLatestData([]);
                      setSensorHistories({});
                      setPaginaSensores(0);
                  }}
                  className="min-w-32"
                  size="sm"
                  placeholder={`Seleccionar ${modoVista === 'CULTIVO' ? 'Cultivo' : 'Lote'}`}
                >
                  {modoVista === 'CULTIVO' ? (
                    cultivos.map(c => (
                      <SelectItem key={c.id.toString()}>{c.nombre}</SelectItem>
                    ))
                  ) : modoVista === 'LOTE' ? (
                    lotes.map(l => (
                      <SelectItem key={l.id.toString()}>{l.nombre}</SelectItem>
                    ))
                  ) : null}
                </Select>

                {modoVista === 'LOTE' && filtroId !== 'TODOS' && (
                  <select
                    value={surcoSeleccionado}
                    onChange={(e) => {
                        setSurcoSeleccionado(e.target.value === 'TODOS' ? 'TODOS' : Number(e.target.value));
                        setLatestData([]);
                        setSensorHistories({});
                        setPaginaSensores(0);
                    }}
                    className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-3 py-2 min-w-32 shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <option value="TODOS">Todos los Surcos</option>
                    {surcos.filter(s => s.lote.id === filtroId).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* ACCIONES */}
          <div className="flex items-center gap-2">
            {/* BOTÓN DE CONTROL MAESTRO */}
            {modoVista === 'LOTE' && filtroId !== 'TODOS' && (
              <Button
                onClick={toggleSystemRecording}
                variant="solid"
                color={isSystemRecording ? "success" : "warning"}
                size="sm"
                className="text-xs font-semibold"
                startContent={isSystemRecording ? <Pause size={14} /> : <Play size={14} />}
              >
                {isSystemRecording ? "Pausar" : "Activar"}
              </Button>
            )}

            {/* BOTONES DE ACCIÓN */}
            <div className="flex items-center gap-1">
              <Button
                onClick={() => openBrokerModal()}
                variant="light"
                color="secondary"
                size="sm"
                className="min-w-0 px-2"
                startContent={<Server size={14} />}
                title="Gestionar Brokers"
              />

              {modoVista === 'LOTE' && filtroId !== 'TODOS' && (
                <>
                  <Button
                    onClick={() => handleSincronizar(filtroId as number)}
                    variant="light"
                    color="primary"
                    size="sm"
                    className="min-w-0 px-2"
                    startContent={<RefreshCw size={14} />}
                    title="Sincronizar Sensores"
                  />

                  <Button
                    onClick={() => {
                      toast.info("Función de descarga próximamente disponible");
                    }}
                    variant="light"
                    color="success"
                    size="sm"
                    className="min-w-0 px-2"
                    startContent={<Download size={14} />}
                    title="Descargar Reporte de Trazabilidad"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className={`flex-1 bg-gray-50/50 rounded-lg p-3 border transition-colors duration-500 ${isSystemRecording && filtroId !== 'TODOS' ? 'border-green-200 bg-green-50/10' : 'border-gray-200'} overflow-hidden flex flex-col`}>

        <div className="flex justify-between items-center mb-3 px-2">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-700">
                {modoVista === 'GENERAL' ? 'Todos los Sensores' :
                 modoVista === 'CULTIVO' ? `Cultivo: ${cultivos.find(c=>c.id===filtroId)?.nombre || 'Seleccionar'}` :
                 `Lote: ${lotes.find(l=>l.id===filtroId)?.nombre || 'Seleccionar'}`}
              </h2>

              {modoVista === 'LOTE' && surcoSeleccionado !== 'TODOS' && (
                <span className="px-2 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-700">
                  Surco: {surcos.find(s=>s.id===surcoSeleccionado)?.nombre}
                </span>
              )}

              {/* Estado del sistema */}
              {modoVista === 'LOTE' && filtroId !== 'TODOS' && (
                isSystemRecording ?
                  <span className="text-xs text-green-600 font-semibold animate-pulse flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> GRABANDO
                  </span>
                  :
                  <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                    <Pause size={10}/> PAUSADO
                  </span>
              )}
            </div>
        </div>

        {/* PAGINACIÓN HORIZONTAL DE SENSORES - 4 POR PÁGINA */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-inner overflow-hidden">
          {sensoresFiltrados.length > 0 ? (
            <div className="relative flex items-center">
              {/* Botón anterior */}
              {paginaSensores > 0 && (
                <button
                  onClick={paginaAnterior}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105"
                  title="Ver sensores anteriores"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Contenedor de tarjetas */}
              <div className="flex gap-2 px-10 py-4 min-h-24 w-full justify-center overflow-x-auto">
                {sensoresPaginaActual.map(sensor => (
                  <div key={sensor.id} className="flex-shrink-0 w-56">
                    <SensorCard
                      sensor={sensor}
                      latestData={sensor.latestData}
                      isSystemRecording={isSystemRecording}
                      onDelete={(id) => eliminarSensor(id).then(loadStructure)}
                      onViewHistory={setHistorySensor}
                      onToggleEstado={(id, estado) => handleToggleEstadoSensor(id, estado)}
                      menuOpen={menuOpen}
                      onMenuToggle={setMenuOpen}
                    />
                  </div>
                ))}
              </div>

              {/* Botón siguiente */}
              {paginaSensores < totalPaginas - 1 && (
                <button
                  onClick={paginaSiguiente}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105"
                  title="Ver más sensores"
                >
                  <ChevronRight size={20} />
                </button>
              )}

              {/* Indicador de página */}
              {totalPaginas > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-white/80 px-2 py-1 rounded-full shadow-sm">
                  {Array.from({ length: totalPaginas }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                        i === paginaSensores ? 'bg-blue-500 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Filter size={16} className="mx-auto mb-1 opacity-50" />
                <p className="text-xs">Sin sensores</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GRÁFICA GENERAL AMPLIADA */}
      {sensoresFiltrados.length > 0 && Object.keys(sensorHistories).length > 0 && (
        <div className={`flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-100 p-3 animate-in fade-in slide-in-from-bottom-4 ${!isSystemRecording ? 'opacity-70 grayscale' : ''}`}>
          <div className="flex justify-between items-start mb-3">
           <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
             <TrendingUp size={14} className="text-blue-600"/>
             {modoVista === 'GENERAL' && filtroId !== 'TODOS'
               ? `Lote: ${lotes.find(l => l.id === filtroId)?.nombre}`
               : modoVista === 'CULTIVO' && filtroId !== 'TODOS'
               ? `Cultivo: ${cultivos.find(c => c.id === filtroId)?.nombre}`
               : modoVista === 'LOTE' && filtroId !== 'TODOS'
               ? `Lote: ${lotes.find(l => l.id === filtroId)?.nombre}`
               : sensoresGrafica.length === 1
               ? `Sensor: ${sensoresFiltrados.find(s => s.id === sensoresGrafica[0])?.nombre}`
               : sensoresGrafica.length > 1
               ? `${sensoresGrafica.length} Sensores Seleccionados`
               : 'Todos los Sensores'
             }
             {!isSystemRecording && " (Congelado)"}
           </h3>
            <div className="flex items-center gap-2">
              {/* FILTRO POR LOTE EN MODO GENERAL */}
              {modoVista === 'GENERAL' && (
                <select
                  value={filtroId}
                  onChange={(e) => {
                    const value = e.target.value === 'TODOS' ? 'TODOS' : Number(e.target.value);
                    setFiltroId(value);
                    setSensoresGrafica([]); // Limpiar selección de gráfica al cambiar filtro
                    setLatestData([]);
                    setSensorHistories({});
                    setPaginaSensores(0);
                  }}
                  className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-3 py-2 min-w-32 shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <option value="TODOS">Todos los lotes</option>
                  {lotes.map(l => (
                    <option key={l.id} value={l.id}>{l.nombre}</option>
                  ))}
                </select>
              )}

              <Dropdown>
                <DropdownTrigger>
                  <Button
                    variant={sensoresGrafica.length > 0 ? "solid" : "bordered"}
                    size="sm"
                    className="text-xs"
                    color={sensoresGrafica.length > 0 ? "primary" : "default"}
                  >
                    {sensoresGrafica.length === 1
                      ? sensoresFiltrados.find(s => s.id === sensoresGrafica[0])?.nombre || 'Sensor'
                      : sensoresGrafica.length > 1
                      ? `${sensoresGrafica.length} sensores`
                      : 'Seleccionar sensores'
                    }
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Selección de sensores para gráfica"
                  closeOnSelect={false}
                  selectionMode="multiple"
                  selectedKeys={sensoresGrafica.length > 0 ? sensoresGrafica.map(String) : new Set()}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys).map(k => Number(k));
                    setSensoresGrafica(selected);
                  }}
                  className="max-h-60 overflow-y-auto"
                >
                  {sensoresFiltrados.map(sensor => (
                    <DropdownItem key={sensor.id} textValue={sensor.nombre}>
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-sm flex-1 truncate">{sensor.nombre}</span>
                        <div className={`w-2 h-2 rounded-full ${sensor.estado === 'Activo' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      </div>
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>

              {sensoresGrafica.length > 0 && sensoresGrafica.length < sensoresFiltrados.length && (
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => setSensoresGrafica([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  startContent={<X size={12} />}
                >
                  Mostrar Todos
                </Button>
              )}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320} key={`chart-${sensoresGrafica.join('-')}`}>
            {(() => {
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
              const sensoresParaGraficar = sensoresGrafica.length > 0 ? sensoresGrafica : sensoresFiltrados.map(s => s.id);

              if (sensoresParaGraficar.length === 0) {
                return <div className="flex items-center justify-center h-full text-gray-500 text-sm">No hay sensores para mostrar</div>;
              }

              // Verificar si tenemos datos para al menos un sensor
              const hasData = sensoresParaGraficar.some(sensorId => sensorHistories[sensorId] && sensorHistories[sensorId].length > 0);

              if (!hasData) {
                return <div className="flex items-center justify-center h-full text-gray-500 text-sm">Cargando datos...</div>;
              }

              const firstSensorId = sensoresParaGraficar[0];
              const maxPoints = Math.max(...sensoresParaGraficar.map(id => sensorHistories[id]?.length || 0));
              const pointsToShow = Math.min(maxPoints, sensoresParaGraficar.length === 1 ? 30 : 20); // Más puntos para mejor sensibilidad

              const chartData = Array.from({length: pointsToShow}, (_, i) => {
                const obj: any = { time: sensorHistories[firstSensorId]?.[i]?.time || `${i+1}` };
                sensoresParaGraficar.forEach(sensorId => {
                  const sensor = sensoresFiltrados.find(s => s.id === sensorId);
                  const history = sensorHistories[sensorId];
                  const valor = history?.[i]?.valor ?? null;
                  if (valor !== null && sensor) {
                    const min = sensor.valor_minimo_alerta;
                    const max = sensor.valor_maximo_alerta;
                    const porcentaje = Math.min(100, Math.max(0, ((valor - min) / (max - min)) * 100));
                    obj[sensorId] = porcentaje;
                    // Guardar el valor real para el tooltip
                    obj[`${sensorId}_real`] = valor;
                  } else {
                    obj[sensorId] = null;
                    obj[`${sensorId}_real`] = null;
                  }
                });
                return obj;
              });

              // Tooltip personalizado para mostrar valores reales y porcentajes
              const CustomTooltip = ({ active, payload, label }: any) => {
                if (!active || !payload || !payload.length) return null;

                return (
                  <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-lg min-w-52 max-w-64">
                    <p className="text-sm font-bold text-gray-800 mb-2 border-b border-gray-100 pb-1 text-center">
                      🕐 {label}
                    </p>
                    <div className="space-y-1.5">
                      {payload.map((entry: any, index: number) => {
                        const sensor = sensoresFiltrados.find(s => s.id === Number(entry.dataKey));
                        const unit = sensor?.nombre.toLowerCase().includes('luz') ? 'lux' :
                                    sensor?.nombre.toLowerCase().includes('temperatura') ? '°C' :
                                    sensor?.nombre.toLowerCase().includes('humedad') ? '%' : '';
                        const porcentaje = Number(entry.value);
                        const valorReal = entry.payload[`${entry.dataKey}_real`];
                        const isValidValue = !isNaN(porcentaje) && porcentaje !== null;

                        return (
                          <div key={index} className="flex items-center justify-between gap-2 p-1 rounded bg-gray-50">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-xs font-medium text-gray-700 truncate">
                                {sensor?.nombre || `Sensor ${entry.dataKey}`}
                              </span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-bold text-gray-900 tabular-nums">
                                {isValidValue ? `${porcentaje.toFixed(1)}%` : '--'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {valorReal !== null ? `${valorReal.toFixed(2)} ${unit}`.trim() : '--'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              };

              return (
                <LineChart data={chartData} margin={{ top: 15, right: 20, left: 15, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="time"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    angle={-45}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    width={45}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{
                      fontSize: '11px',
                      paddingTop: '10px'
                    }}
                    iconType="line"
                    verticalAlign="bottom"
                    height={36}
                  />
                  {sensoresParaGraficar.map((sensorId, i) => {
                    const sensor = sensoresFiltrados.find(s => s.id === sensorId);
                    return (
                      <Line
                        key={`line-${sensorId}-${sensoresGrafica.join('-')}`}
                        type="monotone"
                        dataKey={sensorId}
                        stroke={colors[i % colors.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 4,
                          stroke: colors[i % colors.length],
                          strokeWidth: 2,
                          fill: '#fff',
                          style: { filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.2))' }
                        }}
                        name={sensor?.nombre || `Sensor ${sensorId}`}
                        isAnimationActive={true}
                        animationDuration={800}
                        connectNulls={true} // Mejor conexión de datos
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}
                </LineChart>
              );
            })()}
          </ResponsiveContainer>
        </div>
      )}

      {/* MODALES */}
      <SensorChartsCarousel sensor={historySensor} onClose={() => setHistorySensor(null)} />
      <BrokerFormModal
        isOpen={isBrokerModalOpen}
        onClose={closeBrokerModal}
        onSuccess={() => { closeBrokerModal(); loadStructure(); }}
        broker={editingBroker}
        brokers={[]} // TODO: Pasar la lista de brokers desde el estado
      />
    </div>
  );
}