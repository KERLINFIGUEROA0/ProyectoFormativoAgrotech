import React, { useState, useEffect, useMemo, type ReactElement } from 'react';
import { toast } from 'sonner';
import { 
  Bell, Clock, AlertTriangle, LineChart as ChartIcon, Power, PowerOff, 
  TrendingUp, MoreVertical, Filter, Sprout, Map, Layers, 
  RefreshCw, Pause, Play, Eye, Lock, Database
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, AreaChart, Area
} from 'recharts';

// --- APIS ---
import {
  listarSensores, eliminarSensor, getLatestSensorData, getSensorHistory, actualizarEstadoSensor
} from '../api/sensoresApi';
import { listarBrokers } from '../api/mqttConfigApi';
import { listarCultivos } from '../../cultivos/api/cultivosApi';
// Asegúrate de importar 'actualizarSurco'
import { listarSurcos, sincronizarSensoresSurco, actualizarSurco } from '../../cultivos/api/surcosApi'; 

// --- COMPONENTES ---
import Modal from '../../../components/Modal';
import BrokerFormModal from '../components/BrokerFormModal';
  
// --- INTERFACES ---
import type { Sensor, LatestSensorData } from '../interfaces/iot';
import type { Cultivo, Surco } from '../../cultivos/interfaces/cultivos';
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
// COMPONENTE 1: TARJETA RESUMEN (VISTA GENERAL)
// ==========================================
interface SummaryCardProps {
  surco: Surco;
  cultivoNombre: string;
  sensores: Sensor[];
  onViewDetails: (surcoId: number) => void;
}

function SummaryCard({ surco, cultivoNombre, sensores, onViewDetails }: SummaryCardProps) {
  // Detectamos si el surco está activo para recibir datos (backend)
  const isRecording = surco.activo_mqtt !== false; // Por defecto true si es undefined

  return (
    <div className={`bg-white shadow-md rounded-xl p-5 border transition-all flex flex-col h-full relative overflow-hidden group hover:shadow-lg ${isRecording ? 'border-green-200' : 'border-gray-200'}`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${isRecording ? 'bg-green-500' : 'bg-gray-400'}`}></div>
      
      <div className="flex justify-between items-start mb-3 pl-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{surco.nombre}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Sprout size={14} className="text-green-600" />
            <span className="font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-md">
              {cultivoNombre}
            </span>
          </div>
        </div>
        <button 
          onClick={() => onViewDetails(surco.id)}
          className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
          title="Ver detalles y controlar"
        >
          <Eye size={20} />
        </button>
      </div>

      <div className="flex-1 pl-3 mt-2">
        <div className="flex justify-between items-center mb-2">
           <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sensores ({sensores.length})</p>
           {isRecording ? 
             <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Database size={8}/> GRABANDO</span> :
             <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Pause size={8}/> PAUSADO</span>
           }
        </div>
        
        <div className="space-y-2 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
          {sensores.length > 0 ? (
            sensores.map((sensor) => (
              <div key={sensor.id} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100">
                <div className={`w-2 h-2 rounded-full ${sensor.estado === 'Activo' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="truncate">{sensor.nombre}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic">Sin sensores configurados</p>
          )}
        </div>
      </div>
    </div>
  );
}

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
    <div className={`bg-white shadow-md rounded-xl p-4 relative transition-all border-2 ${cardBorderColor} flex flex-col hover:shadow-lg h-auto min-h-[200px]`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 w-full pr-6">
          <div className={`p-2 bg-gray-50 rounded-full ${bellAnimation}`}>
            <Bell className={`w-4 h-4 ${bellColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-800 text-sm truncate" title={sensor.nombre}>{sensor.nombre}</h3>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full mt-1 inline-block ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {sensor.estado}
            </span>
          </div>
        </div>
        
        <div className="absolute top-3 right-3">
          <button onClick={() => onMenuToggle(menuOpen === sensor.id.toString() ? null : sensor.id.toString())} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
            <MoreVertical size={16} />
          </button>
          {menuOpen === sensor.id.toString() && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-100 z-20 py-1 text-sm animate-in fade-in zoom-in-95 duration-100">
              <button onClick={() => { onToggleEstado(sensor.id, isActive ? 'Inactivo' : 'Activo'); onMenuToggle(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-gray-50">
                {isActive ? <PowerOff size={14} /> : <Power size={14} />} {isActive ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => { onViewHistory(sensor); onMenuToggle(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-gray-50">
                <ChartIcon size={14} /> Ver Historial
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center py-4">
        {valor !== null ? (
          <>
            <div className={`text-4xl font-bold tracking-tight ${valorColor} flex items-baseline gap-1`}>
              {Number(valor).toFixed(1)}
              <span className="text-base font-medium text-gray-400">{unit}</span>
            </div>
            
            {/* Indicador de estado */}
            {!isSystemRecording && (
               <div className="mt-2 flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                 <Pause size={10} /> Último dato (Congelado)
               </div>
            )}
            {isSystemRecording && alertMessage && (
                <div className={`mt-2 flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-opacity-10 ${valorColor.replace('text-', 'bg-')} ${valorColor}`}>
                  <AlertTriangle size={10} /> {alertMessage}
                </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <span className="text-3xl font-bold text-gray-300">--</span>
            <p className="text-xs text-gray-400 mt-1">Sin datos</p>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
         <span className="flex items-center gap-1"><Clock size={10}/> {latestData?.fechaRegistro ? subtract5Hours(latestData.fechaRegistro)?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
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
  const [activeChart, setActiveChart] = useState(0);

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
  const CommonAxis = <><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" /><XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} /><YAxis fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} /><Tooltip /><Legend /></>;
  const renderChart = () => {
    if (loading) return <div className="h-64 flex items-center justify-center text-gray-400">Cargando datos...</div>;
    if (history.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No hay datos registrados</div>;
    switch (activeChart) {
      case 0: return <ResponsiveContainer width="100%" height={300}><LineChart data={history}>{CommonAxis}<Line type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>;
      case 1: return <ResponsiveContainer width="100%" height={300}><BarChart data={history}>{CommonAxis}<Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>;
      case 2: return <ResponsiveContainer width="100%" height={300}><AreaChart data={history}>{CommonAxis}<Area type="monotone" dataKey="valor" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} /></AreaChart></ResponsiveContainer>;
      default: return null;
    }
  };

  return (
    <Modal isOpen={!!sensor} onClose={onClose} title={`Historial: ${sensor.nombre}`} size="4xl">
      <div className="p-6">
        <div className="flex justify-center gap-2 mb-4">
          {['Línea', 'Barras', 'Área'].map((label, i) => (
            <button key={i} onClick={() => setActiveChart(i)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeChart === i ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
          ))}
        </div>
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
  const [modoVista, setModoVista] = useState<'GENERAL' | 'CULTIVO' | 'SURCO'>('GENERAL');
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [surcos, setSurcos] = useState<Surco[]>([]);
  const [filtroId, setFiltroId] = useState<number | 'TODOS'>('TODOS');

  // Modales y UI
  const [historySensor, setHistorySensor] = useState<Sensor | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [sensorHistories, setSensorHistories] = useState<{ [sensorId: number]: ChartData[] }>({});

  // 1. CARGA DE ESTRUCTURA
  const loadStructure = async () => {
    try {
      const [sensoresRes, brokersRes, cultivosRes, surcosRes] = await Promise.all([
        listarSensores(),
        listarBrokers(),
        listarCultivos(),
        listarSurcos()
      ]);
      setSensores(sensoresRes.data || []);
      setCultivos(cultivosRes.data || []);
      setSurcos(surcosRes.data || []);
      if ((brokersRes || []).length === 0) setIsBrokerModalOpen(true);
    } catch (error) {
      console.error("Error cargando estructura", error);
    }
  };

  useEffect(() => { loadStructure(); }, []);

  // --- LOGICA DE CONTROL (Backend) ---

  // Detectar estado actual del surco seleccionado
  const currentSurco = useMemo(() => {
    if (modoVista === 'SURCO' && filtroId !== 'TODOS') {
      return surcos.find(s => s.id === filtroId);
    }
    return null;
  }, [surcos, filtroId, modoVista]);

  // Estado REAL de grabación (viene de la BD)
  const isSystemRecording = currentSurco?.activo_mqtt !== false; // Default true

  // 2. CARGA DE DATOS (Siempre consulta, el backend decide si hay datos nuevos o no)
  const fetchData = async () => {
    // Si estamos en general o viendo historial, no consumimos API de datos innecesariamente
    if (filtroId === 'TODOS' || historySensor) return;

    try {
      const datos = await getLatestSensorData();
      setLatestData(datos || []);

      // Load histories if not loaded
      if (Object.keys(sensorHistories).length === 0 && (itemsFiltrados as Sensor[]).length > 0) {
        const promises = (itemsFiltrados as Sensor[]).map(sensor =>
          getSensorHistory(sensor.id).then(data => {
            const formatted = (data || []).sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime()).slice(-10).map(r => ({
              time: subtract5Hours(r.fechaRegistro)?.toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'}) || '',
              valor: Number(r.valor),
              fecha: subtract5Hours(r.fechaRegistro)?.toLocaleDateString('es-CO') || '',
            }));
            return { sensorId: sensor.id, history: formatted };
          })
        );
        Promise.all(promises).then(results => {
          const newHistories: { [sensorId: number]: ChartData[] } = {};
          results.forEach(({ sensorId, history }) => {
            newHistories[sensorId] = history;
          });
          setSensorHistories(newHistories);
        }).catch(() => toast.error("Error cargando historial"));
      }
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  // POLLING CONSTANTE (Cada 3s para mejor respuesta)
  useEffect(() => {
    // Consultamos siempre, porque aunque el Surco esté pausado en Backend,
    // queremos ver el último dato que quedó guardado (congelado).
    fetchData(); // Carga inicial al montar o cambiar filtro
    
    const interval = setInterval(fetchData, 3000); 
    return () => clearInterval(interval);
  }, [filtroId, historySensor]);

  // Cierre menú
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => { if (menuOpen && !(e.target as Element).closest('button')) setMenuOpen(null); };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, [menuOpen]);

  const toggleSystemRecording = async () => {
    if (!currentSurco) return;
    
    const newState = !isSystemRecording;
    const toastId = toast.loading(newState ? "Activando grabación de datos..." : "Pausando grabación de datos...");
    
    try {
      // Llamada al Backend para cambiar el estado REAL del surco
      await actualizarSurco(currentSurco.id, { activo_mqtt: newState });
      
      toast.success(newState ? "✅ Surco activo: Recibiendo datos." : "⏸️ Surco pausado: Datos congelados.", { id: toastId });

      // Recargamos la estructura para actualizar el objeto 'surco' localmente
      loadStructure();
      if (newState) setSensorHistories({}); // Reload histories when resuming
    } catch (error) {
      toast.error("Error al cambiar estado del surco", { id: toastId });
    }
  };

  // Handlers UI
  const handleModoChange = (modo: 'GENERAL' | 'CULTIVO' | 'SURCO') => {
    setModoVista(modo);
    setFiltroId('TODOS');
    setLatestData([]);
    setSensorHistories({});
  };

  const handleSincronizar = async (surcoId: number, nombreSurco: string) => {
    const toastId = toast.loading(`Sincronizando sensores...`);
    try {
      const res = await sincronizarSensoresSurco(surcoId);
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

  // Filtrado de datos para render
  const itemsFiltrados = useMemo(() => {
    if (filtroId === 'TODOS') return surcos; // Vista General = Surcos (Estructura)
    
    // Vista Detalle = Sensores (Datos)
    let res = sensores.map(s => ({ ...s, latestData: latestData.find(d => d.id === s.id) }));
    if (modoVista === 'CULTIVO') res = res.filter(s => s.surco?.cultivo?.id === filtroId);
    if (modoVista === 'SURCO') res = res.filter(s => s.surco?.id === filtroId);
    return res;
  }, [sensores, latestData, modoVista, filtroId, surcos]);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
           <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">Monitor IoT</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión de Sensores</p>
           </div>

           {/* BOTÓN DE CONTROL MAESTRO (Solo visible si hay un Surco seleccionado) */}
           {modoVista === 'SURCO' && filtroId !== 'TODOS' && (
             <button
               onClick={toggleSystemRecording}
               className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                 isSystemRecording 
                   ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200' 
                   : 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
               }`}
             >
               {isSystemRecording ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
               {isSystemRecording ? "PAUSAR GRABACIÓN" : "ACTIVAR GRABACIÓN"}
             </button>
           )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center bg-gray-50 p-2 rounded-xl">
          <div className="flex bg-white p-1 rounded-lg shadow-sm border border-gray-100">
            {[
              { id: 'GENERAL', icon: Layers, label: 'General', color: 'text-blue-600' },
              { id: 'CULTIVO', icon: Sprout, label: 'Cultivo', color: 'text-green-600' },
              { id: 'SURCO', icon: Map, label: 'Surco', color: 'text-amber-600' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => handleModoChange(m.id as any)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${modoVista === m.id ? `bg-gray-100 ${m.color} font-bold shadow-sm` : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <m.icon size={16} /> {m.label}
              </button>
            ))}
          </div>

          {modoVista !== 'GENERAL' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <select 
                value={filtroId} 
                onChange={(e) => {
                   setFiltroId(e.target.value === 'TODOS' ? 'TODOS' : Number(e.target.value));
                   setLatestData([]); // Limpiar visualmente al cambiar
                   setSensorHistories({}); // Resetear historiales al cambiar filtro
                }}
                className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-48 py-2 px-3 shadow-sm"
              >
                <option value="TODOS">Seleccionar {modoVista === 'CULTIVO' ? 'Cultivo' : 'Surco'}</option>
                {modoVista === 'CULTIVO' && cultivos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                {modoVista === 'SURCO' && surcos.map(s => <option key={s.id} value={s.id}>{s.nombre} (Lote: {s.lote?.nombre})</option>)}
              </select>

              {modoVista === 'SURCO' && filtroId !== 'TODOS' && (
                <button
                  onClick={() => handleSincronizar(filtroId as number, surcos.find(s => s.id === filtroId)?.nombre || 'Surco')}
                  className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Sincronizar Sensores"
                >
                  <RefreshCw size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className={`bg-gray-50/50 rounded-3xl p-6 border transition-colors duration-500 ${isSystemRecording && filtroId !== 'TODOS' ? 'border-green-200 bg-green-50/10' : 'border-gray-200'}`}>
        
        <div className="flex justify-between items-center mb-6">
           {filtroId === 'TODOS' ? (
             <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
               <Layers className="text-blue-500"/> Estructura General
             </h2>
           ) : (
             <div className="flex items-center gap-3">
               <span className={`px-3 py-1 rounded-lg text-sm font-bold ${modoVista === 'CULTIVO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                 {modoVista === 'CULTIVO' ? cultivos.find(c=>c.id===filtroId)?.nombre : surcos.find(s=>s.id===filtroId)?.nombre}
               </span>
               
               {/* Estado del sistema */}
               {modoVista === 'SURCO' && (
                 isSystemRecording ? 
                   <span className="text-xs text-green-600 font-bold animate-pulse flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div> GRABANDO</span> 
                   : 
                   <span className="text-xs text-amber-600 font-bold flex items-center gap-1"><Pause size={10}/> CONGELADO (No graba)</span>
               )}
             </div>
           )}
        </div>

        {/* GRID */}
        {itemsFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtroId === 'TODOS' ? (
              /* VISTA GENERAL: Resumen Estructural */
              (itemsFiltrados as Surco[]).map(surco => (
                   <SummaryCard 
                     key={surco.id}
                     surco={surco}
                     cultivoNombre={surco.cultivo?.nombre || 'Sin Cultivo'}
                     sensores={sensores.filter(s => s.surco?.id === surco.id)}
                     onViewDetails={(id) => {
                        setModoVista('SURCO');
                        setFiltroId(id);
                     }}
                   />
              ))
            ) : (
              /* VISTA DETALLE: Sensores con Datos (o congelados) */
              (itemsFiltrados as Sensor[]).map(sensor => (
                <SensorCard
                  key={sensor.id}
                  sensor={sensor}
                  latestData={sensor.latestData}
                  isSystemRecording={isSystemRecording} // Pasamos el estado para cambiar el diseño visual
                  onDelete={(id) => eliminarSensor(id).then(loadStructure)}
                  onViewHistory={setHistorySensor}
                  onToggleEstado={(id, estado) => handleToggleEstadoSensor(id, estado)}
                  menuOpen={menuOpen}
                  onMenuToggle={setMenuOpen}
                />
              ))
            )}
          </div>
        ) : (
          <div className="text-center py-20 opacity-60">
            <Filter size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-lg text-gray-500">No hay elementos para mostrar.</p>
          </div>
        )}
      </div>

      {/* GRÁFICA GENERAL */}
      {filtroId !== 'TODOS' && Object.keys(sensorHistories).length > 0 && (
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-in fade-in slide-in-from-bottom-4 ${!isSystemRecording ? 'opacity-70 grayscale' : ''}`}>
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600"/>
            Tendencias {!isSystemRecording && "(Congelado)"}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            {(() => {
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
              const firstSensorId = Object.keys(sensorHistories)[0];
              const chartData = Array.from({length: 10}, (_, i) => {
                const obj: any = { time: sensorHistories[Number(firstSensorId)][i]?.time || `${i+1}` };
                Object.keys(sensorHistories).forEach(sensorId => {
                  const history = sensorHistories[Number(sensorId)];
                  obj[sensorId] = history[i]?.valor ?? 0;
                });
                return obj;
              });
              return (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  {Object.keys(sensorHistories).map((sensorId, i) => {
                    const sensor = (itemsFiltrados as Sensor[]).find(s => s.id === Number(sensorId));
                    return <Line key={sensorId} type="monotone" dataKey={sensorId} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} name={sensor?.nombre || ''} isAnimationActive={false} />;
                  })}
                </LineChart>
              );
            })()}
          </ResponsiveContainer>
        </div>
      )}

      {/* MODALES */}
      <SensorChartsCarousel sensor={historySensor} onClose={() => setHistorySensor(null)} />
      <BrokerFormModal isOpen={isBrokerModalOpen} onClose={() => setIsBrokerModalOpen(false)} onSuccess={() => { setIsBrokerModalOpen(false); loadStructure(); }} broker={null} />
    </div>
  );
}