import React, { useState, useEffect, useMemo, type ReactElement } from 'react';
import { toast } from 'sonner';
import {
  Bell, Clock, AlertTriangle, LineChart as ChartIcon, Power, PowerOff,
  TrendingUp, MoreVertical, Filter, Map, Layers,
  RefreshCw, Pause, Play, Download, X,
  ChevronLeft, ChevronRight, Server
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Hero UI Components
import { Select, SelectItem, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection } from "@heroui/react";

// --- APIS ---
import {
  listarSensores, eliminarSensor, getLatestSensorData, getSensorHistory, actualizarEstadoSensor, sincronizarSensoresLote, eliminarSensorDeLote
} from '../api/sensoresApi';
import {
  listarBrokers,
  crearBrokerLote,
  listarBrokerLotesPorLote,
  actualizarBrokerLote,
  eliminarBrokerLote
} from '../api/mqttConfigApi';
// Asegúrate de importar 'actualizarLote'
import { obtenerLotes, actualizarLote } from '../../cultivos/api/lotesApi';

// --- COMPONENTES ---
import Modal from '../../../components/Modal';
import BrokerFormModal from '../components/BrokerFormModal';
  
// --- INTERFACES ---
import type { Sensor, LatestSensorData, Broker, BrokerLote, CreateBrokerLoteDto } from '../interfaces/iot';
import type { Sublote, Lote } from '../../cultivos/interfaces/cultivos';
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
  onRemoveFromLote: (sensor: Sensor) => void;
}

function SensorCard({ sensor, latestData, isSystemRecording, onViewHistory, onToggleEstado, onRemoveFromLote }: SensorCardProps) {
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
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="w-6 h-6 min-w-6"
              >
                <MoreVertical size={12} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Acciones del sensor"
              variant="flat"
              onAction={(key) => {
                switch (key) {
                  case 'toggle':
                    onToggleEstado(sensor.id, isActive ? 'Inactivo' : 'Activo');
                    break;
                  case 'history':
                    onViewHistory(sensor);
                    break;
                  case 'delete':
                    onRemoveFromLote(sensor);
                    break;
                }
              }}
            >
              <DropdownSection title="Estado">
                <DropdownItem
                  key="toggle"
                  startContent={isActive ? <PowerOff size={14} /> : <Power size={14} />}
                  color={isActive ? "danger" : "success"}
                >
                  {isActive ? 'Desactivar' : 'Activar'}
                </DropdownItem>
              </DropdownSection>

              <DropdownSection title="Acciones">
                <DropdownItem
                  key="history"
                  startContent={<ChartIcon size={14} />}
                  color="primary"
                >
                  Ver Historial
                </DropdownItem>
              </DropdownSection>

              <DropdownSection title="Peligroso">
                <DropdownItem
                  key="delete"
                  startContent={<X size={14} />}
                  color="danger"
                  className="text-danger"
                >
                  Eliminar del Lote
                </DropdownItem>
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>
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
// COMPONENTE: MODAL PARA CONFIGURACIONES BROKER-LOTE
// ==========================================
interface BrokerLoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: CreateBrokerLoteDto) => void;
  onUpdate: (id: number, topicos: string[]) => void;
  onDelete: (id: number) => void;
  onEdit: (brokerLote: BrokerLote) => void;
  onCreateBroker: () => void;
  brokerLote: BrokerLote | null;
  brokerLotes: BrokerLote[];
  loteId?: number;
  brokers: Broker[];
  lotes: Lote[];
}

function BrokerLoteModal({ isOpen, onClose, onSuccess, onUpdate, onDelete, onEdit, onCreateBroker, brokerLote, brokerLotes, loteId, brokers, lotes }: BrokerLoteModalProps) {
  const [selectedBrokerId, setSelectedBrokerId] = useState<number | null>(null);
  const [topicos, setTopicos] = useState<string[]>([]);
  const [nuevoTopico, setNuevoTopico] = useState('');

  useEffect(() => {
    if (brokerLote) {
      setSelectedBrokerId(brokerLote.broker.id);
      setTopicos([...brokerLote.topicos]);
    } else {
      setSelectedBrokerId(null);
      setTopicos([]);
    }
    setNuevoTopico('');
  }, [brokerLote]);

  const handleAddTopico = () => {
    if (nuevoTopico.trim() && !topicos.includes(nuevoTopico.trim())) {
      setTopicos([...topicos, nuevoTopico.trim()]);
      setNuevoTopico('');
    }
  };

  const handleRemoveTopico = (topico: string) => {
    setTopicos(topicos.filter(t => t !== topico));
  };

  const handleSubmit = () => {
    if (!selectedBrokerId || topicos.length === 0 || !loteId) return;

    if (brokerLote) {
      // Actualizar
      onUpdate(brokerLote.id, topicos);
    } else {
      // Crear
      onSuccess({
        brokerId: selectedBrokerId,
        loteId: loteId,
        topicos: topicos
      });
    }
  };

  const loteNombre = loteId ? lotes.find(l => l.id === loteId)?.nombre : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${brokerLote ? 'Editar' : 'Crear'} Configuración Broker-Lote`} size="3xl">
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Lote: {loteNombre}
          </h3>
          <p className="text-sm text-gray-600">
            Configura qué broker usar y qué tópicos MQTT escuchar para este lote.
          </p>
        </div>

        {/* Lista de configuraciones existentes */}
        {brokerLotes.length > 0 && (
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-700 mb-3">Configuraciones Existentes</h4>
            <div className="space-y-2">
              {brokerLotes.map(bl => (
                <div key={bl.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <span className="font-medium text-gray-800">{bl.broker.nombre}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {bl.topicos.map(topico => (
                        <span key={topico} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {topico}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      onClick={() => onEdit(bl)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      onClick={() => onDelete(bl.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulario */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Broker MQTT
            </label>
            <Select
              selectedKeys={selectedBrokerId ? new Set([selectedBrokerId.toString()]) : new Set()}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys);
                setSelectedBrokerId(selected.length > 0 ? Number(selected[0]) : null);
              }}
              className="w-full"
              placeholder={brokers.length === 0 ? "No hay brokers disponibles" : "Seleccionar broker"}
              disabled={brokers.length === 0}
            >
              {brokers.map(broker => (
                <SelectItem key={broker.id.toString()}>
                  {broker.nombre} ({broker.host}:{broker.puerto})
                </SelectItem>
              ))}
            </Select>
            {brokers.length === 0 && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700 mb-2">
                  ⚠️ No hay brokers configurados.
                </p>
                <Button
                  size="sm"
                  color="primary"
                  variant="light"
                  onClick={onCreateBroker}
                >
                  Crear Broker Primero
                </Button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tópicos MQTT
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={nuevoTopico}
                onChange={(e) => setNuevoTopico(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTopico()}
                placeholder="Ej: temperatura/lote1"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Button
                onClick={handleAddTopico}
                color="primary"
                size="sm"
                disabled={!nuevoTopico.trim()}
              >
                Agregar
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {topicos.map(topico => (
                <div key={topico} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {topico}
                  <button
                    onClick={() => handleRemoveTopico(topico)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="light" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="primary"
            onClick={handleSubmit}
            disabled={!selectedBrokerId || topicos.length === 0}
          >
            {brokerLote ? 'Actualizar' : 'Crear'} Configuración
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ==========================================
// COMPONENTE: MODAL PARA ELIMINAR SENSOR DEL LOTE
// ==========================================
interface DeleteSensorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sensor: Sensor | null;
  loteNombre: string;
}

function DeleteSensorModal({ isOpen, onClose, onConfirm, sensor, loteNombre }: DeleteSensorModalProps) {
  if (!sensor) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Sensor del Lote" size="sm">
      <div className="p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            ¿Desea eliminar el sensor del lote?
          </h3>
          <div className="mt-2 px-4 py-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Sensor:</span> {sensor.nombre}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-medium">Lote:</span> {loteNombre}
            </p>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Esta acción no se puede deshacer.
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="light" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="danger"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
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
  const [modoVista, setModoVista] = useState<'GENERAL' | 'LOTE'>('GENERAL');
  const [sublotes, setSublotes] = useState<Sublote[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [filtroId, setFiltroId] = useState<number | 'TODOS'>('TODOS');
  const [surcoSeleccionado, setSurcoSeleccionado] = useState<number | 'TODOS'>('TODOS');

  // Modales y UI
  const [historySensor, setHistorySensor] = useState<Sensor | null>(null);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [sensorHistories, setSensorHistories] = useState<{ [sensorId: number]: ChartData[] }>({});
  const [sensoresGrafica, setSensoresGrafica] = useState<number[]>([]);
  const [paginaSensores, setPaginaSensores] = useState(0);
  const tarjetasPorPagina = 4;

  // Estados para BrokerLote
  const [isBrokerLoteModalOpen, setIsBrokerLoteModalOpen] = useState(false);
  const [brokerLotes, setBrokerLotes] = useState<BrokerLote[]>([]);
  const [editingBrokerLote, setEditingBrokerLote] = useState<BrokerLote | null>(null);

  // Estado para modal de eliminación de sensor
  const [isDeleteSensorModalOpen, setIsDeleteSensorModalOpen] = useState(false);
  const [sensorToDelete, setSensorToDelete] = useState<Sensor | null>(null);

  // 1. CARGA DE ESTRUCTURA
  const loadStructure = async () => {
    try {
      const [sensoresRes, brokersRes, lotesRes] = await Promise.all([
        listarSensores(),
        listarBrokers(),
        obtenerLotes()
      ]);
      setSensores(sensoresRes.data || []);
      setBrokers(brokersRes || []);
      const lotesData = lotesRes.data || [];
      setLotes(lotesData);
      // Extraer todos los sublotes de todos los lotes
      const allSublotes = lotesData.flatMap((lote: Lote) => (lote.sublotes || []).filter((s: any) => s.lote && s.lote.id));
      setSublotes(allSublotes);

      // Si no hay brokers, abrir automáticamente el modal para crear uno
      if (!brokersRes || brokersRes.length === 0) {
        setIsBrokerModalOpen(true);
      }
    } catch (error) {
      console.error("Error cargando estructura", error);
    }
  };

  // Cargar configuraciones BrokerLote para un lote específico
  const loadBrokerLotes = async (loteId: number) => {
    try {
      const brokerLotesRes = await listarBrokerLotesPorLote(loteId);
      setBrokerLotes(brokerLotesRes || []);
    } catch (error) {
      console.error("Error cargando configuraciones BrokerLote", error);
      setBrokerLotes([]);
    }
  };

  useEffect(() => { loadStructure(); }, []);

  // Cargar configuraciones BrokerLote cuando se selecciona un lote
  useEffect(() => {
    if (modoVista === 'LOTE' && filtroId !== 'TODOS') {
      loadBrokerLotes(filtroId as number);
    } else {
      setBrokerLotes([]);
    }
  }, [modoVista, filtroId]);

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

  // POLLING CONSTANTE (Cada 5s para mejor respuesta)
  useEffect(() => {
    // Consultamos siempre, porque aunque el lote esté pausado en Backend,
    // queremos ver el último dato que quedó guardado (congelado).
    fetchData(); // Carga inicial al montar o cambiar filtro

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [filtroId, surcoSeleccionado, historySensor, sensores.length]); // Agregar dependencia de sensores para refrescar cuando se agregan nuevos


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

  // Cargar historiales para todos los sensores al inicio (para gráfica general)
  useEffect(() => {
    if (sensores.length > 0 && Object.keys(sensorHistories).length === 0) {
      // Solo cargar si no hay historiales cargados aún
      const promises = sensores.slice(0, 10).map(sensor => // Limitar a primeros 10 para performance inicial
        getSensorHistory(sensor.id).then(data => {
          const formatted = (data || []).sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime()).slice(-10).map(r => ({
            time: subtract5Hours(r.fechaRegistro)?.toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'}) || '',
            valor: Number(r.valor),
            fecha: subtract5Hours(r.fechaRegistro)?.toLocaleDateString('es-CO') || '',
          }));
          return { sensorId: sensor.id, history: formatted };
        }).catch(() => ({ sensorId: sensor.id, history: [] })) // En caso de error, devolver array vacío
      );

      Promise.all(promises).then(results => {
        setSensorHistories(prev => {
          const newHistories = { ...prev };
          results.forEach(({ sensorId, history }) => {
            newHistories[sensorId] = history;
          });
          return newHistories;
        });
      }).catch(() => {
        // Silenciar errores iniciales para no molestar al usuario
      });
    }
  }, [sensores, sensorHistories]);

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
  const handleModoChange = (modo: 'GENERAL' | 'LOTE') => {
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


  const handleSincronizar = async (loteId: number) => {
    const toastId = toast.loading(`Sincronizando sensores...`);
    try {
      const res = await sincronizarSensoresLote(loteId);
      if (res.sensoresCreados > 0) {
        toast.success(res.message, { id: toastId });
        // Limpiar TODOS los datos para forzar recarga completa
        setSensorHistories({});
        setLatestData([]);
        setSensoresGrafica([]);

        await loadStructure();
        await loadBrokerLotes(loteId); // Recargar configuraciones

        // Forzar múltiples cargas inmediatas de datos con intervalos agresivos
        const fetchIntervals = [100, 500, 1000, 1500, 2000, 3000, 4000];
        fetchIntervals.forEach(delay => {
          setTimeout(() => fetchData(), delay);
        });

        // Después de las cargas iniciales, asegurar que estamos en el modo correcto
        setTimeout(() => {
          if (modoVista === 'LOTE' && filtroId === loteId) {
            setSensoresGrafica([]); // Mostrar todos los sensores del lote
          }
        }, 4500);
      } else {
        toast.info("Sensores al día", { id: toastId });
      }
    } catch (error: any) {
      toast.error("Error al sincronizar", { id: toastId });
    }
  };

  // Funciones para BrokerLote
  const openBrokerLoteModal = (brokerLote: BrokerLote | null = null) => {
    setEditingBrokerLote(brokerLote);
    setIsBrokerLoteModalOpen(true);
  };

  const closeBrokerLoteModal = () => {
    setIsBrokerLoteModalOpen(false);
    setEditingBrokerLote(null);
  };

  const handleCreateBrokerLote = async (data: CreateBrokerLoteDto) => {
    const toastId = toast.loading("Creando configuración y sensores...");
    try {
      await crearBrokerLote(data);
      toast.success("Configuración creada y sensores generados", { id: toastId });
      closeBrokerLoteModal();

      // Limpiar TODOS los datos para forzar recarga completa
      setSensorHistories({});
      setLatestData([]);
      setSensoresGrafica([]);

      await loadStructure(); // Recarga brokers también
      await loadBrokerLotes(data.loteId);

      // Forzar múltiples cargas inmediatas de datos con intervalos agresivos
      const fetchIntervals = [100, 500, 1000, 1500, 2000, 3000, 4000];
      fetchIntervals.forEach(delay => {
        setTimeout(() => fetchData(), delay);
      });

      // Después de las cargas iniciales, continuar con el polling normal
      setTimeout(() => {
        // Cambiar a modo LOTE para mostrar los sensores del lote creado
        setModoVista('LOTE');
        setFiltroId(data.loteId);
        setSensoresGrafica([]); // Mostrar todos los sensores del lote
      }, 4500);

    } catch (error: any) {
      toast.error("Error al crear configuración", { id: toastId });
    }
  };

  const handleUpdateBrokerLote = async (id: number, topicos: string[]) => {
    const toastId = toast.loading("Actualizando configuración...");
    try {
      await actualizarBrokerLote(id, topicos);
      toast.success("Configuración actualizada", { id: toastId });
      closeBrokerLoteModal();
      if (filtroId !== 'TODOS') {
        loadBrokerLotes(filtroId as number);
      }
    } catch (error: any) {
      toast.error("Error al actualizar configuración", { id: toastId });
    }
  };

  const handleDeleteBrokerLote = async (id: number) => {
    const toastId = toast.loading("Eliminando configuración...");
    try {
      await eliminarBrokerLote(id);
      toast.success("Configuración eliminada", { id: toastId });
      if (filtroId !== 'TODOS') {
        loadBrokerLotes(filtroId as number);
      }
      loadStructure();
    } catch (error: any) {
      toast.error("Error al eliminar configuración", { id: toastId });
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


  const handleRemoveSensorFromLote = (sensor: Sensor) => {
    setSensorToDelete(sensor);
    setIsDeleteSensorModalOpen(true);
  };

  const confirmRemoveSensorFromLote = async () => {
    if (!sensorToDelete) return;

    const toastId = toast.loading(`Eliminando sensor...`);
    try {
      await eliminarSensorDeLote(sensorToDelete.id);
      toast.success("Sensor eliminado del lote", { id: toastId });
      loadStructure();
      if (filtroId !== 'TODOS') {
        loadBrokerLotes(filtroId as number);
      }
      setIsDeleteSensorModalOpen(false);
      setSensorToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al eliminar sensor", { id: toastId });
    }
  };

  const closeDeleteSensorModal = () => {
    setIsDeleteSensorModalOpen(false);
    setSensorToDelete(null);
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

    if (modoVista === 'LOTE') {
      // Mostrar solo sensores asociados directamente al lote (creados por sincronización)
      res = res.filter(s => s.lote?.id === filtroId);
      if (surcoSeleccionado !== 'TODOS') {
        res = res.filter(s => s.surco?.id === surcoSeleccionado);
      }
    }

    return res;
  }, [sensores, latestData, modoVista, filtroId, surcoSeleccionado, sublotes]);

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
                  className="min-w-40 max-w-56"
                  size="sm"
                  placeholder="Seleccionar Lote"
                  items={(lotes || []).map(l => ({ key: l.id.toString(), label: l.nombre }))}
                  scrollShadowProps={{
                    isEnabled: false
                  }}
                >
                  {(item) => <SelectItem className="truncate">{item.label}</SelectItem>}
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
                    {sublotes.filter(s => s.lote.id === filtroId).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
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
                     onClick={() => openBrokerLoteModal()}
                     variant="light"
                     color="warning"
                     size="sm"
                     className="min-w-0 px-2"
                     startContent={<Layers size={14} />}
                     title="Configurar Sensores por Lote"
                   />

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
                 `Lote: ${lotes.find(l=>l.id===filtroId)?.nombre || 'Seleccionar'}`}
              </h2>

              {modoVista === 'LOTE' && surcoSeleccionado !== 'TODOS' && (
                <span className="px-2 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-700">
                  Sublote: {sublotes.find(s=>s.id===surcoSeleccionado)?.nombre}
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

        {/* Leyenda de Colores de Estado - Una sola línea */}
        <div className="flex items-center gap-4 p-2 bg-white rounded-lg shadow-sm border border-gray-100 mb-4 mx-2">
          <span className="text-xs font-medium text-gray-500">Estados:</span>

          {/* Alto - Rojo */}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-gray-600 font-medium">Alto</span>
          </div>

          {/* Bajo - Azul */}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs text-gray-600 font-medium">Bajo</span>
          </div>

          {/* Óptimo - Gris */}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span className="text-xs text-gray-600 font-medium">Óptimo</span>
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
                      onRemoveFromLote={handleRemoveSensorFromLote}
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
      {sensoresFiltrados.length > 0 && (
        <div className={`flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-100 p-3 animate-in fade-in slide-in-from-bottom-4 ${!isSystemRecording ? 'opacity-70 grayscale' : ''}`}>
          <div className="flex justify-between items-start mb-3">
           <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
             <TrendingUp size={14} className="text-blue-600"/>
             {modoVista === 'GENERAL' && filtroId !== 'TODOS'
               ? `Lote: ${lotes.find(l => l.id === filtroId)?.nombre}`
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
                <Select
                  selectedKeys={filtroId === 'TODOS' ? [] : [filtroId.toString()]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys);
                    const value = selected.length > 0 ? selected[0] : 'TODOS';
                    setFiltroId(value === 'TODOS' ? 'TODOS' : Number(value));
                    setSensoresGrafica([]); // Limpiar selección de gráfica al cambiar filtro
                    setLatestData([]);
                    setSensorHistories({});
                    setPaginaSensores(0);
                  }}
                  className="min-w-48 max-w-64"
                  size="sm"
                  placeholder="Todos los lotes"
                  items={[
                    { key: 'TODOS', label: 'Todos los lotes' },
                    ...(lotes || []).map(l => ({ key: l.id.toString(), label: l.nombre }))
                  ]}
                  scrollShadowProps={{
                    isEnabled: false
                  }}
                >
                  {(item) => <SelectItem className="truncate">{item.label}</SelectItem>}
                </Select>
              )}

              <Select
                selectedKeys={sensoresGrafica.length > 0 ? sensoresGrafica.map(String) : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys).map(k => Number(k));
                  setSensoresGrafica(selected);
                }}
                selectionMode="multiple"
                className="min-w-48 max-w-64"
                size="sm"
                placeholder="Seleccionar sensores"
                items={(sensoresFiltrados || []).map(sensor => ({
                  key: sensor.id.toString(),
                  label: `${sensor.nombre} ${sensor.estado === 'Activo' ? '●' : '○'}`
                }))}
                scrollShadowProps={{
                  isEnabled: false
                }}
                renderValue={(items) => {
                  if (items.length === 0) return null;
                  return (
                    <span className="text-xs text-gray-600 font-medium">
                      {items.length} sensor{items.length !== 1 ? 'es' : ''} seleccionado{items.length !== 1 ? 's' : ''}
                    </span>
                  );
                }}
              >
                {(item) => <SelectItem className="truncate">{item.label}</SelectItem>}
              </Select>

              {sensoresGrafica.length > 0 && sensoresGrafica.length < sensoresFiltrados.length && (
                <Button
                  variant="flat"
                  size="sm"
                  onClick={() => setSensoresGrafica([])}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                  startContent={<RefreshCw size={12} />}
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
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                    width={45}
                  />
                  {sensoresGrafica.length <= 4 && sensoresGrafica.length > 0 && <Tooltip />}
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
      <BrokerLoteModal
        isOpen={isBrokerLoteModalOpen}
        onClose={closeBrokerLoteModal}
        onSuccess={handleCreateBrokerLote}
        onUpdate={handleUpdateBrokerLote}
        onDelete={handleDeleteBrokerLote}
        onEdit={(brokerLote) => setEditingBrokerLote(brokerLote)}
        onCreateBroker={() => {
          closeBrokerLoteModal();
          openBrokerModal();
        }}
        brokerLote={editingBrokerLote}
        brokerLotes={brokerLotes}
        loteId={filtroId !== 'TODOS' ? filtroId as number : undefined}
        brokers={brokers}
        lotes={lotes}
      />
      <DeleteSensorModal
        isOpen={isDeleteSensorModalOpen}
        onClose={closeDeleteSensorModal}
        onConfirm={confirmRemoveSensorFromLote}
        sensor={sensorToDelete}
        loteNombre={sensorToDelete?.lote?.nombre || 'Sin lote asignado'}
      />
    </div>
  );
}