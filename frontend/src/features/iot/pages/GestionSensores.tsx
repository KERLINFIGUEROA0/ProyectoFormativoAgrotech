import React, { useState, useEffect, useMemo, type ReactElement } from 'react';
import { toast } from 'sonner';
import {
  Bell, Clock, AlertTriangle, LineChart as ChartIcon, Power, PowerOff,
  TrendingUp, MoreVertical, Filter, Map, Layers,
  RefreshCw, Pause, Download, X,
  ChevronLeft, ChevronRight, Server, Activity, Trash2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Hero UI Components
import { Select, SelectItem, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection, Input,ModalContent, ModalHeader, ModalBody } from "@heroui/react";

// --- APIS ---
import {
  listarSensores, eliminarSensor, getLatestSensorData, getSensorHistory, actualizarEstadoSensor, eliminarSensorDeLote
} from '../api/sensoresApi';
import {
  listarBrokers,
  crearBrokerLote,
  listarBrokerLotesPorLote,
  actualizarBrokerLote,
  eliminarBrokerLote
} from '../api/mqttConfigApi';
// Asegúrate de importar 'actualizarLote'
import { obtenerLotes } from '../../cultivos/api/lotesApi';

// --- COMPONENTES ---
import Modal from '../../../components/Modal';
import BrokerFormModal from '../components/BrokerFormModal';
import ModalDescargarTrazabilidad from '../components/ModalDescargarTrazabilidad';
  
// --- INTERFACES ---
import type { Sensor, LatestSensorData, Broker, BrokerLote, CreateBrokerLoteDto } from '../interfaces/iot';
import type { Lote } from '../../cultivos/interfaces/cultivos';
import { usePermissionGuard } from '../../../hooks/usePermissionGuard';

// --- HOOKS ---

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
  timestamp: number;
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
  // 🔥 CORRECCIÓN: Confiar solo en el estado que viene del Backend
  const isDisconnected = latestData?.estado === 'Desconectado';
  const tieneDatos = latestData !== undefined && rawValor !== null;

  // 1. Detectar si es una bomba
  const isBomba = sensor.nombre.toLowerCase().includes('bomba') || sensor.topic?.toLowerCase().includes('bomba');

  // DEBUG: Log para verificar el nombre del sensor bomba
  if (isBomba) {
    console.log('DEBUG SensorCard - Nombre del sensor bomba:', sensor.nombre);
  }

  const getDisplayData = (sensor: Sensor, valor: number | null) => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';

    // Si es bomba, devolvemos el valor tal cual (se procesará en el render)
    if (isBomba) return { valor, unit: '' };

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

  // Determinar estado visual
  if (isDisconnected) {
    valorColor = "text-red-600";
    alertMessage = "DESCONECTADO";
    cardBorderColor = "border-red-500";
    bellColor = "text-red-600";
    bellAnimation = "animate-pulse";
  } else if (!tieneDatos) {
    // Estado de sincronización: esperando datos
    valorColor = "text-gray-400";
    alertMessage = null;
    cardBorderColor = "border-gray-300";
    bellColor = "text-gray-400";
    bellAnimation = "";
  } else if (valor !== null) {
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

  // MODIFICACIÓN DE COLORES PARA BOMBA:
  if (isBomba && valor !== null) {
      if (Number(valor) === 1) {
          valorColor = "text-green-600"; // Color para ON
      } else {
          valorColor = "text-red-500"; // Color para OFF
      }
  }

  // Si el sistema NO está grabando, quitamos colores de alerta para indicar "congelado"
  if (!isSystemRecording && valor !== null && !isDisconnected && tieneDatos) {
    valorColor = "text-gray-500";
    bellAnimation = "";
    alertMessage = null;
  }

  const isActive = sensor.estado === 'Activo';
  const isOnline = sensor.ultimo_mqtt_mensaje && new Date().getTime() - new Date(sensor.ultimo_mqtt_mensaje).getTime() < 10000;

  return (
    <div className={`bg-gradient-to-br from-white to-gray-50 shadow-lg rounded-xl p-2 relative transition-all duration-300 border-2 ${cardBorderColor} flex flex-col hover:shadow-xl hover:scale-[1.02] hover:translate-z-10 hover:rotate-y-3 hover:rotate-x-2 h-[88px] overflow-hidden`}>
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
            <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded-full inline-block shadow-sm ${
              isDisconnected ? 'bg-red-100 text-red-700 border border-red-200' :
              isOnline ? 'bg-green-100 text-green-700 border border-green-200' :
              !tieneDatos ? 'bg-gray-100 text-gray-700 border border-gray-200' :
              isActive ? 'bg-green-100 text-green-700 border border-green-200' :
              'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              {isDisconnected ? '● DESCONECTADO' : isOnline ? '● EN LÍNEA' : !tieneDatos ? '● SINCRONIZANDO' : isActive ? '● EN LÍNEA' : '● INACTIVO'}
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
              {isBomba ? (
                // Lógica especial para Bomba
                <span>{Number(valor) === 1 ? 'ON' : 'OFF'}</span>
              ) : (
                // Lógica normal para sensores numéricos
                Number(valor).toFixed(1)
              )}
              <span className="text-[11px] font-semibold text-gray-500">{unit}</span>
            </div>

            {/* Indicador de estado - SIEMPRE visible para mantener altura consistente */}
            {!isSystemRecording ? (
                <div className="mt-0.5 text-[8px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shadow-sm">
                  <Pause size={7} className="inline mr-1" /> ⏸️ Congelado
                </div>
            ) : !tieneDatos && !isOnline ? (
                <div className="mt-0.5 text-[8px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 shadow-sm">
                  <RefreshCw size={7} className="inline mr-1 animate-spin" /> Sincronizando...
                </div>
            ) : alertMessage ? (
                <div className={`mt-0.5 text-[8px] font-bold px-2 py-1 rounded-full border shadow-sm ${alertMessage === 'ALTO' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                  <AlertTriangle size={7} className="inline mr-1" /> ⚠️ {alertMessage}
                </div>
            ) : isBomba ? (
                // 3. Estado "Normal" personalizado para Bomba
                <div className={`mt-0.5 text-[8px] font-bold px-2 py-1 rounded-full border shadow-sm ${Number(valor) === 1 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  {Number(valor) === 1 ? '⚡ Funcionando' : 'zzz Apagado'}
                </div>
            ) : (
                <div className="mt-0.5 text-[8px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 shadow-sm">
                  <div className="inline mr-1 w-1.5 h-1.5 bg-green-500 rounded-full" /> ✅ Normal
                </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <span className="text-base font-bold text-gray-300">N/A</span>
            <p className="text-[8px] text-gray-400">Esperando datos </p>
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
  onUpdate: (id: number, topicos: (string | { topic: string; min?: number; max?: number })[], puerto?: number, topicPrueba?: string) => void;
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
  const [topicos, setTopicos] = useState<{ topic: string; min?: number; max?: number }[]>([]);
  const [nuevoTopico, setNuevoTopico] = useState('');
  const [nuevoMin, setNuevoMin] = useState<number | undefined>(undefined);
  const [nuevoMax, setNuevoMax] = useState<number | undefined>(undefined);
  const [puerto, setPuerto] = useState<number | undefined>(undefined);
  const [topicPrueba, setTopicPrueba] = useState<string>('');
  const [testResult, setTestResult] = useState<any | null>(null);

  useEffect(() => {
    const loadExistingConfiguration = async () => {
      if (brokerLote && loteId) {
        setSelectedBrokerId(brokerLote.broker.id);
        setPuerto(brokerLote.puerto);
        setTopicPrueba(brokerLote.topicPrueba || '');

        // Cargar sensores existentes para obtener sus umbrales actuales
        try {
          const sensoresResponse = await fetch(`http://localhost:3000/sensores?loteId=${loteId}`);
          const sensoresData = await sensoresResponse.json();

          // Filtrar sensores que corresponden a los tópicos de esta configuración
          const sensoresConfiguracion = sensoresData.data.filter((sensor: any) =>
            brokerLote.topicos.some(topic => sensor.topic === topic)
          );

          // Crear el array de tópicos con sus umbrales actuales
          const topicosConUmbrales = brokerLote.topicos.map(topic => {
            const sensorExistente = sensoresConfiguracion.find((sensor: any) => sensor.topic === topic);
            return {
              topic,
              min: sensorExistente?.valor_minimo_alerta || undefined,
              max: sensorExistente?.valor_maximo_alerta || undefined,
            };
          });

          setTopicos(topicosConUmbrales);
        } catch (error) {
          console.error('Error cargando sensores existentes:', error);
          // Fallback: solo cargar los tópicos sin umbrales
          setTopicos(brokerLote.topicos.map(topic => ({ topic })));
        }
      } else {
        setSelectedBrokerId(null);
        setTopicos([]);
        setPuerto(undefined);
        setTopicPrueba('');
      }
      setNuevoTopico('');
      setNuevoMin(undefined);
      setNuevoMax(undefined);
      setTestResult(null); // Limpiar resultado de test al cambiar configuración
    };

    loadExistingConfiguration();
  }, [brokerLote, loteId]);

  // Limpiar resultado de test cuando cambie broker, puerto o topicPrueba
  useEffect(() => {
    setTestResult(null);
  }, [selectedBrokerId, puerto, topicPrueba]);

  const handleAddTopico = () => {
    if (nuevoTopico.trim() && !topicos.some(t => t.topic === nuevoTopico.trim())) {
      setTopicos([...topicos, { topic: nuevoTopico.trim(), min: nuevoMin, max: nuevoMax }]);
      setNuevoTopico('');
      setNuevoMin(undefined);
      setNuevoMax(undefined);
    }
  };

  const handleRemoveTopico = (topic: string) => {
    setTopicos(topicos.filter(t => t.topic !== topic));
  };

  const handleUpdateTopico = (index: number, field: 'min' | 'max', value: number | undefined) => {
    const updatedTopicos = [...topicos];
    updatedTopicos[index] = { ...updatedTopicos[index], [field]: value };
    setTopicos(updatedTopicos);
  };

  const handleTestConnection = async () => {
    if (!selectedBrokerId) return;

    const toastId = toast.loading("Probando conexión...");
    try {
      const response = await fetch('http://localhost:3000/mqtt-config/broker-lotes/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          brokerId: selectedBrokerId,
          puerto: puerto,
          topicos: topicos.map(t => t.topic),
          topicPrueba: topicPrueba || undefined
        })
      });

      const result = await response.json();
      setTestResult(result);

      if (result.connected) {
        toast.success(result.message, { id: toastId });
      } else {
        toast.error(result.message, { id: toastId });
      }
    } catch (error) {
      toast.error("Error al probar conexión", { id: toastId });
      setTestResult({ connected: false, message: "Error de red", topicsAvailable: [] });
    }
  };

  const handleSubmit = () => {
    if (!selectedBrokerId || topicos.length === 0 || !loteId) return;

    if (brokerLote) {
      // Actualizar
      onUpdate(brokerLote.id, topicos, puerto, topicPrueba);
    } else {
      // Crear
      onSuccess({
        brokerId: selectedBrokerId,
        loteId: loteId,
        topicos: topicos,
        puerto: puerto,
        topicPrueba: topicPrueba || undefined
      });
    }
  };

  const loteNombre = loteId ? lotes.find(l => l.id === loteId)?.nombre : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${brokerLote ? 'Editar' : 'Crear'} Configuración Broker-Lote`} size="3xl">
      <div className="p-6 space-y-6">
        {/* Lista de configuraciones existentes */}
        {brokerLotes.length > 0 && (
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-700 mb-3">Configuraciones Existentes</h4>
            <div className="space-y-2">
              {brokerLotes.map(bl => (
                <div key={bl.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <span className="font-medium text-gray-800">{bl.broker.nombre}</span>
                    {bl.puerto && <span className="text-sm text-gray-600 ml-2">(Puerto: {bl.puerto})</span>}
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
                      className="font-bold"
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      onClick={() => onDelete(bl.id)}
                      className="font-bold"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulario principal con fondo degradado */}
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 rounded-xl border border-gray-200/50 shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Lote: {loteNombre}
            </h3>
            <p className="text-sm text-gray-600">
              Configura qué broker usar y qué tópicos MQTT escuchar para este lote.
            </p>
          </div>

          {/* Sección 1: Configuración del Broker */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Server size={16} className="text-blue-600" />
              Configuración del Broker
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Broker MQTT
                </label>
                <Select
                  key={`broker-select-${selectedBrokerId || 'none'}`}
                  selectedKeys={selectedBrokerId ? new Set([selectedBrokerId.toString()]) : new Set()}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys);
                    setSelectedBrokerId(selected.length > 0 ? Number(selected[0]) : null);
                  }}
                  className="w-full"
                  placeholder={brokers.length === 0 ? "No hay brokers disponibles" : "Seleccionar broker"}
                  disabled={brokers.length === 0}
                  renderValue={(items) => {
                    if (items.length === 0) return "Seleccionar broker";
                    const broker = brokers.find(b => b.id.toString() === items[0].key);
                    return broker ? `${broker.nombre} (${broker.host}:${broker.puerto})` : "Seleccionar broker";
                  }}
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
                  Puerto (opcional)
                </label>
                <Input
                  type="number"
                  value={puerto?.toString() || ''}
                  onChange={(e) => setPuerto(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder={`Por defecto: ${selectedBrokerId ? brokers.find(b => b.id === selectedBrokerId)?.puerto : 'Selecciona broker'}`}
                  fullWidth
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si no especificas, se usará el puerto del broker seleccionado.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic de Prueba (opcional)
                  </label>
                  <Input
                    value={topicPrueba}
                    onChange={(e) => setTopicPrueba(e.target.value)}
                    placeholder="Ej: agrotech/sensores/temperatura"
                    fullWidth
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Especifica un topic para verificar si está enviando datos por este puerto.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 opacity-0">
                    Button
                  </label>
                  <Button
                    onClick={handleTestConnection}
                    color="secondary"
                    variant="solid"
                    disabled={!selectedBrokerId}
                    startContent={<Server size={14} />}
                    className="w-full h-10"
                  >
                    Probar Conexión
                  </Button>
                  {testResult && (
                    <div className={`mt-3 p-3 rounded-lg border ${testResult.connected ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                      <p className="text-sm font-medium">{testResult.message || (testResult.connected ? 'Conectado' : 'No conectado')}</p>
                      {Array.isArray(testResult.topicsAvailable) && testResult.topicsAvailable.length > 0 && (
                        <p className="text-xs text-gray-600 mt-1">Tópicos disponibles: {testResult.topicsAvailable.join(', ')}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sección 3: Tópicos del Lote */}
          <div>
            <h4 className="text-md font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Layers size={16} className="text-purple-600" />
              Tópicos del Lote
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
              <Input
                value={nuevoTopico}
                onChange={(e) => setNuevoTopico(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTopico()}
                placeholder="Ej: temperatura/lote1"
                fullWidth
              />
              <Input
                type="number"
                value={nuevoMin?.toString() || ''}
                onChange={(e) => setNuevoMin(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Min (opcional)"
                fullWidth
              />
              <Input
                type="number"
                value={nuevoMax?.toString() || ''}
                onChange={(e) => setNuevoMax(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Max (opcional)"
                fullWidth
              />
              <Button
                onClick={handleAddTopico}
                color="primary"
                className="h-10"
                disabled={!nuevoTopico.trim()}
              >
                Agregar
              </Button>
            </div>

            <div className="space-y-2">
              {topicos.map((topico, index) => (
                <div key={topico.topic} className="flex items-center gap-2 p-3 bg-white/60 rounded-lg border border-gray-200/50 shadow-sm">
                  <span className="flex-1 font-medium text-gray-800">{topico.topic}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={topico.min?.toString() || ''}
                      onChange={(e) => handleUpdateTopico(index, 'min', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Min"
                      size="sm"
                      className="w-20"
                    />
                    <Input
                      type="number"
                      value={topico.max?.toString() || ''}
                      onChange={(e) => handleUpdateTopico(index, 'max', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Max"
                      size="sm"
                      className="w-20"
                    />
                    <Button
                      onClick={() => handleRemoveTopico(topico.topic)}
                      color="danger"
                      size="sm"
                      variant="light"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <Button variant="light" color="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="success"
            onClick={handleSubmit}
            disabled={!selectedBrokerId || topicos.length === 0}
            className="text-white font-bold"
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
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Sensor">
      <ModalContent>
        <ModalHeader className="flex flex-col items-center justify-center text-center pb-2">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="text-red-600" size={20} />
            </div>
            <h4 className="text-lg font-semibold text-center">¿Eliminar sensor?</h4>
          </div>
        </ModalHeader>
        <ModalBody className="text-center">
          <div className="w-full bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm text-gray-700 mx-auto max-w-xs">
            <div className="font-medium">{sensor.nombre}</div>
            <div className="text-xs text-gray-500 mt-1">Lote: {loteNombre}</div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Esta acción no se puede deshacer.</p>
          <div className="flex gap-3 mt-4 w-full justify-center">
            <Button
              onClick={onClose}
              color="default"
              variant="light"
              className="flex-1 max-w-[120px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              color="danger"
              className="flex-1 max-w-[120px] text-white font-bold"
            >
              Eliminar
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
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
      const formatted = (data || []).sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime()).map(r => {
        let valor = Number(r.valor);

        // Aplicar la MISMA transformación que la tarjeta para TODOS los sensores
        const name = sensor.nombre.toLowerCase();
        const topic = sensor.topic?.toLowerCase() || '';

        // Transformaciones específicas por tipo de sensor (igual que en la tarjeta)
        if (name.includes('luz') || topic.includes('luz')) {
          valor = valor * 100; // Convertir a lux
        }
        // Temperatura, humedad, gas y otros sensores mantienen su valor original
        // pero se mostrarán con las unidades correctas en el tooltip

        const registroTime = new Date(r.fechaRegistro);
        return {
          time: registroTime.toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'}),
          fecha: registroTime.toLocaleDateString('es-CO'),
          valor: valor,
          timestamp: registroTime.getTime(),
        };
      });
      setHistory(formatted);
    }).catch(() => toast.error("Error cargando historial")).finally(() => setLoading(false));
  }, [sensor]);

  if (!sensor) return null;

  const renderChart = () => {
    if (loading) return <div className="h-64 flex items-center justify-center text-gray-400">Cargando datos...</div>;
    if (history.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No hay datos registrados</div>;

    // Calcular el rango dinámico de valores para mayor sensibilidad
    const valores = history.map(h => h.valor).filter(v => v !== null && v !== undefined);
    const minValor = Math.min(...valores);
    const maxValor = Math.max(...valores);
    const rango = maxValor - minValor;

    // Si el rango es muy pequeño, expandir ligeramente para mejor visualización
    const padding = rango * 0.1; // 10% de padding
    const domainMin = minValor - padding;
    const domainMax = maxValor + padding;

    // Determinar precisión decimal basada en el rango
    const getPrecision = (range: number) => {
      if (range < 0.01) return 4; // Para cambios muy pequeños
      if (range < 0.1) return 3;
      if (range < 1) return 2;
      if (range < 10) return 1;
      return 0;
    };

    const precision = getPrecision(rango);

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={history} margin={{ top: 15, right: 20, left: 15, bottom: 70 }}>
          <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f0f0f0" opacity={0.5} />
          <XAxis
            dataKey="time"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            angle={-45}
            textAnchor="end"
            height={45}
            tick={{ fontSize: 9 }}
          />
          <YAxis
            fontSize={10}
            tickLine={false}
            axisLine={false}
            domain={[domainMin, domainMax]}
            tickFormatter={(value) => {
              const num = Number(value);
              if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'k';
              return num.toFixed(precision);
            }}
            width={50}
            tick={{ fontSize: 9 }}
            tickCount={8} // Más ticks para mejor granularidad
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '12px'
            }}
            formatter={(value: number) => {
              // Sistema inteligente de detección de unidades (igual que en la tarjeta)
              const name = sensor.nombre.toLowerCase();
              const topic = sensor.topic?.toLowerCase() || '';
              let unit = '';

              // Sensores conocidos con unidades específicas
              if (name.includes('luz') || topic.includes('luz')) {
                unit = 'lux';
              } else if (name.includes('temperatura') || topic.includes('temperatura')) {
                unit = '°C';
              } else if (name.includes('humedad')) {
                unit = '%';
              } else if (name.includes('gas') || topic.includes('gas') ||
                        name.includes('co2') || topic.includes('co2') ||
                        name.includes('ppm') || topic.includes('ppm')) {
                unit = 'ppm';
              }

              // Para sensores nuevos/desconocidos, intentar detectar unidades comunes
              else {
                // Detección por tópico MQTT (común en IoT)
                if (topic.includes('temp') || topic.includes('temperature')) unit = '°C';
                else if (topic.includes('hum') || topic.includes('humidity')) unit = '%';
                else if (topic.includes('press') || topic.includes('pressure')) unit = 'hPa';
                else if (topic.includes('volt') || topic.includes('voltage')) unit = 'V';
                else if (topic.includes('current') || topic.includes('amp')) unit = 'A';
                else if (topic.includes('power') || topic.includes('watt')) unit = 'W';
                else if (topic.includes('level') || topic.includes('distance')) unit = 'cm';
                else if (topic.includes('wind') && topic.includes('speed')) unit = 'm/s';
                else if (topic.includes('speed') || topic.includes('velocity')) unit = 'km/h';
                else if (topic.includes('ph') || topic.includes('acidity')) unit = 'pH';
                else if (topic.includes('conductivity') || topic.includes('ec')) unit = 'µS/cm';
                else if (topic.includes('soil') && topic.includes('moisture')) unit = '%';
                else if (topic.includes('rain') || topic.includes('precipitation')) unit = 'mm';
                else if (topic.includes('uv') || topic.includes('radiation')) unit = 'UV';
                // Si no se detecta ninguna unidad específica, se muestra sin unidad
              }

              return [
                <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>
                  {Number(value).toFixed(precision + 1)}{unit && ` ${unit}`}
                </span>,
                sensor.nombre
              ];
            }}
            labelFormatter={(label) => `Hora: ${label}`}
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
            strokeWidth={3}
            dot={false}
            activeDot={{
              r: 5,
              stroke: '#3b82f6',
              strokeWidth: 2,
              fill: '#fff',
              style: {
                filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.4))',
                cursor: 'pointer'
              }
            }}
            name={sensor.nombre}
            isAnimationActive={true}
            animationDuration={300}
            connectNulls={true}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="drop-shadow(0 0 2px rgba(59, 130, 246, 0.2))"
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
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [filtroId, setFiltroId] = useState<number | 'TODOS'>('TODOS');

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

  // Estado para modal de descarga de trazabilidad
  const [isTrazabilidadModalOpen, setIsTrazabilidadModalOpen] = useState(false);

  // Estado para auto-play del carrusel
  const [autoPlay] = useState(true);

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

      // Actualizar historiales en tiempo real para monitoreo
      if (sensoresFiltrados.length > 0) {
        const currentSensorIds = Object.keys(sensorHistories).map(Number);
        const newSensorIds = sensoresFiltrados.map(s => s.id).filter(id => !currentSensorIds.includes(id));

        // Cargar historial inicial para sensores nuevos
        if (newSensorIds.length > 0) {
          const promises = newSensorIds.map(sensorId =>
            getSensorHistory(sensorId).then(data => {
              const formatted = (data || []).sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime()).slice(-20).map(r => {
                let valor = Number(r.valor);
                const sensor = sensoresFiltrados.find(s => s.id === sensorId);
                if (sensor) {
                  const name = sensor.nombre.toLowerCase();
                  const topic = sensor.topic?.toLowerCase() || '';
                  if (name.includes('luz') || topic.includes('luz')) {
                    valor = valor * 100;
                  }
                }
                // Usar la fecha real del registro para monitoreo preciso
                const registroTime = new Date(r.fechaRegistro);
                return {
                  time: registroTime.toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'}),
                  valor: valor,
                  fecha: registroTime.toLocaleDateString('es-CO'),
                  timestamp: registroTime.getTime(),
                };
              });
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

        // Actualizar datos en tiempo real para sensores existentes
        const existingSensorIds = sensoresFiltrados.map(s => s.id).filter(id => currentSensorIds.includes(id));
        existingSensorIds.forEach(sensorId => {
          const sensor = sensoresFiltrados.find(s => s.id === sensorId);
          const latestSensorData = datos?.find(d => d.id === sensorId);

          if (latestSensorData && sensor) {
            // Usar la fecha real del registro del sensor para monitoreo real
            const registroTime = latestSensorData.fechaRegistro ? new Date(latestSensorData.fechaRegistro) : new Date();
            const timeLabel = registroTime.toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'});
            const dateLabel = registroTime.toLocaleDateString('es-CO');

            // Aplicar la misma transformación que en la tarjeta
            let valor = Number(latestSensorData.valor);
            const name = sensor.nombre.toLowerCase();
            const topic = sensor.topic?.toLowerCase() || '';

            if (name.includes('luz') || topic.includes('luz')) {
              valor = valor * 100; // Convertir a lux
            }

            const newPoint = {
              time: timeLabel,
              valor: valor,
              fecha: dateLabel,
              timestamp: registroTime.getTime(),
            };

            setSensorHistories(prev => {
              const currentHistory = prev[sensorId] || [];
              const updatedHistory = [...currentHistory];

              // Verificar si ya existe un punto con timestamp similar (evitar duplicados)
              const existingIndex = updatedHistory.findIndex(point =>
                Math.abs(point.timestamp - newPoint.timestamp) < 1000 // 1 segundo de tolerancia
              );

              if (existingIndex === -1) {
                // Agregar nuevo punto y mantener solo los últimos 50 para rendimiento
                updatedHistory.push(newPoint);
                if (updatedHistory.length > 50) {
                  updatedHistory.shift(); // Remover el más antiguo
                }
              } else {
                // Actualizar punto existente
                updatedHistory[existingIndex] = newPoint;
              }

              return {
                ...prev,
                [sensorId]: updatedHistory
              };
            });
          }
        });
      }
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  // POLLING CONSTANTE (Cada 2s para mejor respuesta)
  useEffect(() => {
    // Consultamos siempre, porque aunque el lote esté pausado en Backend,
    // queremos ver el último dato que quedó guardado (congelado).
    fetchData(); // Carga inicial al montar o cambiar filtro

    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [filtroId, historySensor, sensores.length]); // Agregar dependencia de sensores para refrescar cuando se agregan nuevos


  // Cargar historiales para sensores seleccionados en gráfica
  useEffect(() => {
    if (sensoresGrafica.length > 0) {
      const sensoresSinHistorial = sensoresGrafica.filter(id => !sensorHistories[id]);
      if (sensoresSinHistorial.length > 0) {
        const promises = sensoresSinHistorial.map(sensorId =>
          getSensorHistory(sensorId).then(data => {
            const formatted = (data || []).sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime()).slice(-10).map(r => {
              let valor = Number(r.valor);
              const sensor = sensoresFiltrados.find(s => s.id === sensorId);
              if (sensor) {
                const name = sensor.nombre.toLowerCase();
                const topic = sensor.topic?.toLowerCase() || '';
                if (name.includes('luz') || topic.includes('luz')) {
                  valor = valor * 100;
                }
              }
              const registroTime = new Date(r.fechaRegistro);
              return {
                time: registroTime.toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'}),
                valor: valor,
                fecha: registroTime.toLocaleDateString('es-CO'),
                timestamp: registroTime.getTime(),
              };
            });
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
          const formatted = (data || []).sort((a, b) => new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime()).slice(-10).map(r => {
            let valor = Number(r.valor);
            const name = sensor.nombre.toLowerCase();
            const topic = sensor.topic?.toLowerCase() || '';
            if (name.includes('luz') || topic.includes('luz')) {
              valor = valor * 100;
            }
            // Usar fecha real del registro
            const registroTime = new Date(r.fechaRegistro);
            return {
              time: registroTime.toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'}),
              valor: valor,
              fecha: registroTime.toLocaleDateString('es-CO'),
              timestamp: registroTime.getTime(),
            };
          });
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



  // Handlers UI
  const handleModoChange = (modo: 'GENERAL' | 'LOTE') => {
    setModoVista(modo);
    setFiltroId('TODOS');
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

  const handleUpdateBrokerLote = async (id: number, topicos: (string | { topic: string; min?: number; max?: number })[], puerto?: number, topicPrueba?: string) => {
    const toastId = toast.loading("Actualizando configuración y creando sensores...");
    try {
      await actualizarBrokerLote(id, { topicos, puerto, topicPrueba });
      toast.success("Configuración actualizada y sensores creados", { id: toastId });
      closeBrokerLoteModal();

      // Limpiar TODOS los datos para forzar recarga completa
      setSensorHistories({});
      setLatestData([]);
      setSensoresGrafica([]);

      // Recargar estructura completa (sensores incluidos)
      await loadStructure();

      // Recargar configuraciones BrokerLote
      if (filtroId !== 'TODOS') {
        loadBrokerLotes(filtroId as number);
      }

      // Forzar múltiples cargas inmediatas de datos con intervalos agresivos
      const fetchIntervals = [100, 500, 1000, 1500, 2000, 3000, 4000];
      fetchIntervals.forEach(delay => {
        setTimeout(() => fetchData(), delay);
      });

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
        res = res.filter(s => s.lote?.id === filtroId);
      }
      return res;
    }

    if (modoVista === 'LOTE') {
      // Mostrar solo sensores asociados directamente al lote (creados por sincronización)
      res = res.filter(s => s.lote?.id === filtroId);
    }

    return res;
  }, [sensores, latestData, modoVista, filtroId]);

  // Filtrado de sensores para gráfica (excluir bombas)
  const sensoresParaGrafica = useMemo(() => {
    return sensoresFiltrados.filter(sensor => {
      const isBomba = sensor.nombre.toLowerCase().includes('bomba') || sensor.topic?.toLowerCase().includes('bomba');
      return !isBomba;
    });
  }, [sensoresFiltrados]);

  // Cálculo de sensores para la página actual
  const sensoresPaginaActual = useMemo(() => {
    const inicio = paginaSensores * tarjetasPorPagina;
    const fin = inicio + tarjetasPorPagina;
    return sensoresFiltrados.slice(inicio, fin);
  }, [sensoresFiltrados, paginaSensores, tarjetasPorPagina]);

  // Total de páginas
  const totalPaginas = Math.ceil(sensoresFiltrados.length / tarjetasPorPagina);

  // AUTO-PLAY DEL CARRUSEL (Cada 5s cambia de página automáticamente)
  useEffect(() => {
    if (!autoPlay || totalPaginas <= 1) return;

    const interval = setInterval(() => {
      setPaginaSensores(prev => (prev + 1) % totalPaginas);
    }, 5000); // 5 segundos

    return () => clearInterval(interval);
  }, [autoPlay, totalPaginas]);

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
                { id: 'LOTE', icon: Map, label: 'Lote', color: 'success' }
              ].map((m) => (
                <Button
                  key={m.id}
                  onClick={() => handleModoChange(m.id as any)}
                  variant={modoVista === m.id ? "solid" : "light"}
                  color={m.color as any}
                  size="sm"
                  className={`text-xs font-bold transition-all ${
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
              </div>
            )}
          </div>

          {/* ACCIONES */}
          <div className="flex items-center gap-2">
            {/* BOTONES DE ACCIÓN */}
            <div className="flex items-center gap-2">
               <Button
                 onClick={() => openBrokerModal()}
                 variant="solid"
                 color="success"
                 size="sm"
                 startContent={<Server size={14} />}
                 className="text-white font-bold"
               >
                 Crear Broker
               </Button>

               {/* BOTÓN DE DESCARGA DE TRAZABILIDAD - DISPONIBLE EN AMBOS MODOS */}
               <Button
                 onClick={() => setIsTrazabilidadModalOpen(true)}
                 variant="solid"
                 color="danger"
                 size="sm"
                 startContent={<Download size={14} />}
                 className="text-white font-bold"
               >
                 Descargar Reporte
               </Button>

               {modoVista === 'LOTE' && filtroId !== 'TODOS' && (
                 <Button
                   onClick={() => openBrokerLoteModal()}
                   variant="solid"
                   color="success"
                   size="sm"
                   startContent={<Layers size={14} />}
                   className="text-white font-bold"
                 >
                   Configurar Lote
                 </Button>
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

          {/* Desconectado - Rojo oscuro */}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-xs text-gray-600 font-medium">Desconectado</span>
          </div>

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
              <Button
                onClick={paginaAnterior}
                isIconOnly
                color="primary"
                size="sm"
                className="absolute left-1 top-1/2 -translate-y-1/2 z-10 shadow-lg"
                title="Ver sensores anteriores"
                disabled={paginaSensores === 0}
              >
                <ChevronLeft size={20} />
              </Button>

              {/* Contenedor de tarjetas */}
              <div className="flex gap-2 px-10 py-4 min-h-24 w-full justify-center overflow-x-auto" style={{ perspective: '1000px' }}>
                {sensoresPaginaActual.map(sensor => {
                  return (
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
                  );
                })}
              </div>

              {/* Botón siguiente */}
              <Button
                onClick={paginaSiguiente}
                isIconOnly
                color="primary"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 z-10 shadow-lg"
                title="Ver más sensores"
                disabled={paginaSensores >= totalPaginas - 1}
              >
                <ChevronRight size={20} />
              </Button>

              {/* Indicador de página */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-white/80 px-2 py-1 rounded-full shadow-sm z-20">
                {Array.from({ length: Math.max(totalPaginas, 1) }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                      i === paginaSensores ? 'bg-blue-500 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
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
             {/* Título Dinámico */}
             {sensoresGrafica.length > 0
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
                items={(sensoresParaGrafica || []).map(sensor => {
                  const sensorData = latestData.find(d => d.id === sensor.id);
                  const isDisconnected = sensorData?.estado === 'Desconectado';
                  return {
                    key: sensor.id.toString(),
                    label: `${sensor.nombre} ${isDisconnected ? '❌' : sensor.estado === 'Activo' ? '●' : '○'}`
                  };
                })}
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

              {sensoresGrafica.length > 0 && sensoresGrafica.length < sensoresParaGrafica.length && (
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
          <ResponsiveContainer width="100%" height={320}>
            {(() => {
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

              // 1. 🔥 LÓGICA DINÁMICA DE SELECCIÓN
              // Si el usuario seleccionó sensores manualmente, úsalos.
              // Si NO, usa TODOS los sensores visibles que no sean bombas.
              const sensoresParaGraficarIds = sensoresGrafica.length > 0
                ? sensoresGrafica
                : sensoresParaGrafica.map(s => s.id);

              // 2. Filtrar solo aquellos que tienen historial cargado para evitar líneas vacías
              const sensoresActivosConDatos = sensoresParaGraficarIds.filter(id =>
                sensorHistories[id] && sensorHistories[id].length > 0
              );

              if (sensoresActivosConDatos.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                    <Activity size={32} className="opacity-20 animate-pulse" />
                    <span className="text-xs">Esperando flujo de datos...</span>
                  </div>
                );
              }

              // 3. Normalizar longitud de datos (Tomamos el historial más largo como referencia de tiempo)
              const maxHistoryLength = Math.max(...sensoresActivosConDatos.map(id => sensorHistories[id]?.length || 0));

              // Construimos los datos unificados
              const chartData = Array.from({ length: maxHistoryLength }, (_, i) => {
                // Usamos el tiempo del primer sensor disponible como referencia del eje X
                const refSensorId = sensoresActivosConDatos[0];
                const timeLabel = sensorHistories[refSensorId]?.[i]?.time || '';

                const dataPoint: any = { time: timeLabel };

                sensoresActivosConDatos.forEach(sensorId => {
                  const sensor = sensoresFiltrados.find(s => s.id === sensorId);
                  const history = sensorHistories[sensorId];
                  const point = history?.[i]; // Obtener el punto en el índice i

                  if (point && sensor) {
                    const valor = point.valor;
                    const min = sensor.valor_minimo_alerta || 0;
                    const max = sensor.valor_maximo_alerta || 100;

                    // 🔥 FORMULA DE PORCENTAJE (0-100%)
                    // Evitamos división por cero si min == max
                    const rango = (max - min) === 0 ? 1 : (max - min);
                    const porcentaje = Math.min(100, Math.max(0, ((valor - min) / rango) * 100));

                    dataPoint[sensorId] = porcentaje;       // Valor graficado (0-100)
                    dataPoint[`${sensorId}_real`] = valor;  // Valor real para el tooltip
                    dataPoint[`${sensorId}_name`] = sensor.nombre; // Nombre para tooltip

                    // Si no tenemos etiqueta de tiempo aún, intentar tomarla de este sensor
                    if (!dataPoint.time && point.time) dataPoint.time = point.time;
                  } else {
                    dataPoint[sensorId] = null;
                  }
                });
                return dataPoint;
              });

              return (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="time"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={20}
                  />
                  <YAxis
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]} // Eje Y fijo de 0% a 100%
                    tickFormatter={(value) => `${value}%`}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ color: '#6b7280', fontSize: '10px', marginBottom: '4px' }}
                    formatter={(_value: number, _name: string, props: any) => {
                      // Custom tooltip para mostrar valor real y unidad
                      const dataKey = props.dataKey;
                      const valorReal = props.payload[`${dataKey}_real`];
                      const nombreReal = props.payload[`${dataKey}_name`];

                      // Detectar unidad simple basada en nombre (puedes mejorar esto)
                      let unidad = '';
                      const n = nombreReal?.toLowerCase() || '';
                      if(n.includes('temp')) unidad = '°C';
                      else if(n.includes('hum')) unidad = '%';
                      else if(n.includes('luz')) unidad = 'lx';

                      return [
                        <span className="font-semibold ml-2">
                          {Number(valorReal).toFixed(1)} <span className="text-xs text-gray-500">{unidad}</span>
                        </span>,
                        nombreReal
                      ];
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  />

                  {sensoresActivosConDatos.map((sensorId, i) => {
                    const sensor = sensoresFiltrados.find(s => s.id === sensorId);
                    return (
                      <Line
                        key={sensorId}
                        type="monotone"
                        dataKey={sensorId}
                        name={sensor?.nombre || `Sensor ${sensorId}`}
                        stroke={colors[i % colors.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        isAnimationActive={false} // Desactivar animación para flujo suave continuo
                        connectNulls={true} // 🔥 CRÍTICO: Conecta puntos si hay saltos de conexión
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
      <ModalDescargarTrazabilidad
        isOpen={isTrazabilidadModalOpen}
        onClose={() => setIsTrazabilidadModalOpen(false)}
      />
    </div>
  );
}