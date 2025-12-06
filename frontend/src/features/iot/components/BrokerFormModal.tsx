import { useState, useEffect } from 'react';
import { Server, X, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { Input, Button, Select, SelectItem } from "@heroui/react";
import type { Broker, Lote } from '../interfaces/iot';
import { listarLotes, crearBroker, actualizarBroker, probarConexionBroker } from '../api/mqttConfigApi';

interface BrokerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  broker?: Broker | null;
  brokers?: Broker[]; // Lista de brokers para selección
}

// 1. DEFINICIÓN DE TÓPICOS PREDETERMINADOS (Rutas relativas para encajar con el prefijo)
const defaultTopicsConfig = [
  { key: 'sensores/temperatura', label: 'Temperatura' },
  { key: 'sensores/humedad', label: 'Humedad Aire' },
  { key: 'sensores/luz', label: 'Luminosidad' },
  { key: 'sensores/humedad_suelo', label: 'Humedad Suelo' },
  { key: 'sensores/bomba', label: 'Bomba' }
];

export default function BrokerFormModal({ isOpen, onClose, onSuccess, broker, brokers: _brokers }: BrokerFormModalProps) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [topicosAdicionales, setTopicosAdicionales] = useState<Array<{topic: string, min?: number, max?: number}>>([{topic: '', min: undefined, max: undefined}]);

  // 2. ESTADO INICIAL (Marcados por defecto)
  const [defaultTopicsEnabled, setDefaultTopicsEnabled] = useState<Record<string, boolean>>({
    'sensores/temperatura': true,
    'sensores/humedad': true,
    'sensores/luz': true,
    'sensores/humedad_suelo': true,
    'sensores/bomba': true
  });

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [formData, setFormData] = useState<{
    nombre: string;
    protocolo: 'mqtt' | 'mqtts' | 'http' | 'https' | 'ws' | 'wss';
    host: string;
    puerto: string;
    loteId: string;
    prefijoTopicos: string;
    usuario: string;
    password: string;
  }>({
    nombre: '',
    protocolo: 'mqtt',
    host: '',
    puerto: '',
    loteId: '',
    prefijoTopicos: '', // Idealmente el usuario pondrá 'agrotech' aquí
    usuario: '',
    password: '',
  });

  useEffect(() => {
    if (isOpen) {
      const cargarDatos = async () => {
        try {
          const lotesData = await listarLotes();
          setLotes(lotesData);
        } catch (error) {
          console.error('Error cargando datos:', error);
        }
      };
      cargarDatos();


      if (broker) {
        let loteId = '';
        if (broker.lotes && broker.lotes.length > 0 && broker.lotes[0].id) {
          loteId = broker.lotes[0].id.toString();
        } else if ((broker as any).loteId) {
          loteId = (broker as any).loteId.toString();
        } else {
          loteId = '';
        }

        setFormData({
          nombre: broker.nombre,
          protocolo: broker.protocolo as 'mqtt' | 'mqtts' | 'http' | 'https' | 'ws' | 'wss',
          host: broker.host,
          puerto: broker.puerto.toString(),
          loteId: loteId,
          prefijoTopicos: broker.prefijoTopicos || '',
          usuario: broker.usuario || '',
          password: broker.password || '',
        });

        // Reconstruir estado de checkboxes al editar
        const enabled: Record<string, boolean> = {};
        // Inicializar todos en false
        defaultTopicsConfig.forEach(dt => enabled[dt.key] = false);

        const additional: Array<{topic: string, min?: number, max?: number}> = [];
        const prefix = broker.prefijoTopicos || '';

        broker.topicosAdicionales?.forEach((t: any) => {
          const topicStr = typeof t === 'string' ? t : t.topic;
          // Verificar si coincide con algún default (considerando el prefijo)
          const matchedDefault = defaultTopicsConfig.find(dt =>
            topicStr === (prefix ? `${prefix.replace(/\/$/, '')}/${dt.key}` : dt.key) ||
            topicStr === dt.key // Por si se guardó sin prefijo
          );

          if (matchedDefault) {
            enabled[matchedDefault.key] = true;
          } else {
            const cleanTopic = topicStr.replace(prefix + '/', '');
            if (typeof t === 'string') {
              additional.push({topic: cleanTopic, min: undefined, max: undefined});
            } else {
              additional.push({topic: cleanTopic, min: t.min, max: t.max});
            }
          }
        });
        setDefaultTopicsEnabled(enabled);
        setTopicosAdicionales(additional.length > 0 ? additional : [{topic: '', min: undefined, max: undefined}]);
      } else {
        setFormData({
          nombre: '',
          protocolo: 'mqtt',
          host: '',
          puerto: '',
          loteId: '',
          prefijoTopicos: '',
          usuario: '',
          password: '',
        });
        // Resetear defaults a true
        const defaultsReset: Record<string, boolean> = {};
        defaultTopicsConfig.forEach(dt => defaultsReset[dt.key] = true);
        setDefaultTopicsEnabled(defaultsReset);
        setTopicosAdicionales([{topic: '', min: undefined, max: undefined}]);
      }
    }
  }, [isOpen, broker]);

  const normalizedPrefix = (formData.prefijoTopicos || '').replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/+/g, '/');

  // Función auxiliar para construir la lista de tópicos finales
  const buildTopicList = () => {
    return [
      ...defaultTopicsConfig
        .filter(t => defaultTopicsEnabled[t.key])
        .map(t => normalizedPrefix ? `${normalizedPrefix}/${t.key}` : t.key),
      ...topicosAdicionales
        .filter(t => t.topic && t.topic.trim() !== '')
        .map(t => normalizedPrefix ? `${normalizedPrefix}/${t.topic}` : t.topic)
    ] as string[];
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const data = {
        nombre: formData.nombre,
        protocolo: formData.protocolo,
        host: formData.host,
        puerto: parseInt(formData.puerto),
        loteId: parseInt(formData.loteId),
        prefijoTopicos: normalizedPrefix || undefined,
        topicosAdicionales: buildTopicList(),
        usuario: formData.usuario || undefined,
        password: formData.password || undefined,
      };

      const result = await probarConexionBroker(data);
      if (result.connected) {
        toast.success("Conexión exitosa al broker MQTT.");
      } else {
        toast.error(`Error de conexión: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(`Error al probar la conexión: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const testData = {
        nombre: formData.nombre,
        protocolo: formData.protocolo,
        host: formData.host,
        puerto: parseInt(formData.puerto),
        loteId: parseInt(formData.loteId),
        prefijoTopicos: normalizedPrefix || undefined,
        topicosAdicionales: buildTopicList(),
        usuario: formData.usuario || undefined,
        password: formData.password || undefined,
      };

      const testResult = await probarConexionBroker(testData);
      if (!testResult.connected) {
        toast.error(`No se puede conectar al broker: ${testResult.message}`);
        return;
      }
    } catch (error: any) {
      toast.error(`Error al verificar la conexión: ${error.message}`);
      return;
    }

    try {
      const topicosConConfig = topicosAdicionales
        .filter(t => t.topic && t.topic.trim() !== '')
        .map(t => {
          const fullTopic = normalizedPrefix ? `${normalizedPrefix}/${t.topic}` : t.topic;
          if (t.min !== undefined || t.max !== undefined) {
            return { topic: fullTopic, min: t.min, max: t.max };
          } else {
            return fullTopic;
          }
        });

      const data = {
        nombre: formData.nombre,
        protocolo: formData.protocolo,
        host: formData.host,
        puerto: parseInt(formData.puerto),
        loteId: parseInt(formData.loteId),
        prefijoTopicos: normalizedPrefix || undefined,
        topicosAdicionales: [
          ...defaultTopicsConfig
            .filter(t => defaultTopicsEnabled[t.key])
            .map(t => normalizedPrefix ? `${normalizedPrefix}/${t.key}` : t.key),
          ...topicosConConfig
        ],
        usuario: formData.usuario || undefined,
        password: formData.password || undefined,
      };

      if (broker) {
        await actualizarBroker(broker.id, data);
        toast.success("Broker actualizado exitosamente.");
      } else {
        await crearBroker(data);
        toast.success("Broker creado exitosamente.");
      }

      onClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(`Error guardando broker: ${error.message || 'Error desconocido'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-0 duration-500 ease-out" onClick={onClose}>
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Server className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{broker ? 'Editar Broker' : 'Nuevo Broker'}</h3>
              <p className="text-sm text-gray-600">Configuración de conexión MQTT y Tópicos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">

              {/* SECCIÓN 1: Información del Broker */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Información del Broker
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre del broker"
                    fullWidth
                    required
                  />
                  <Select
                    label="Protocolo"
                    selectedKeys={[formData.protocolo]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as 'mqtt' | 'mqtts' | 'http' | 'https' | 'ws' | 'wss';
                      setFormData({ ...formData, protocolo: selected });
                    }}
                    fullWidth
                  >
                    <SelectItem key="mqtt">MQTT (mqtt://)</SelectItem>
                    <SelectItem key="mqtts">MQTT SSL (mqtts://)</SelectItem>
                    <SelectItem key="http">HTTP (http://)</SelectItem>
                    <SelectItem key="https">HTTPS (https://)</SelectItem>
                    <SelectItem key="ws">WebSocket (ws://)</SelectItem>
                    <SelectItem key="wss">WebSocket SSL (wss://)</SelectItem>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Host"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="ej: test.mosquitto.org"
                    fullWidth
                    required
                  />
                  <Input
                    label="Puerto"
                    type="number"
                    value={formData.puerto}
                    onChange={(e) => setFormData({ ...formData, puerto: e.target.value })}
                    placeholder="1883"
                    fullWidth
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Select
                    label="Lote *"
                    selectedKeys={formData.loteId ? [formData.loteId] : []}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys);
                      setFormData({ ...formData, loteId: String(selected[0]) });
                    }}
                    placeholder="Seleccionar lote"
                    fullWidth
                    required
                  >
                    {lotes.map((lote) => (
                      <SelectItem key={String(lote.id)}>{lote.nombre}</SelectItem>
                    ))}
                  </Select>
                  <Input
                    label="Prefijo Global"
                    value={formData.prefijoTopicos}
                    onChange={(e) => setFormData({ ...formData, prefijoTopicos: e.target.value })}
                    placeholder="ej: agrotech"
                    fullWidth
                  />
                  <div className="flex items-end">
                    <Button
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || !formData.host || !formData.puerto || !formData.loteId}
                      color="primary"
                      fullWidth
                      startContent={<Wifi size={14} />}
                    >
                      {isTestingConnection ? 'Probando...' : 'Probar Conexión'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: Configuración de Tópicos */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
                <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Dispositivos Predeterminados
                </h4>
                <div className="space-y-4">
                  <div className="bg-white p-3 rounded-md border border-green-100">
                    <div className="grid grid-cols-2 gap-3">
                      {defaultTopicsConfig.map((dt) => {
                         // Construcción visual del tópico final
                         const fullTopic = normalizedPrefix ? `${normalizedPrefix}/${dt.key}` : dt.key;

                        return (
                          <label key={dt.key} className={`flex items-center p-2 rounded-md transition-colors cursor-pointer ${defaultTopicsEnabled[dt.key] ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'}`}>
                            <input
                              type="checkbox"
                              checked={defaultTopicsEnabled[dt.key]}
                              onChange={(e) => setDefaultTopicsEnabled(prev => ({ ...prev, [dt.key]: e.target.checked }))}
                              className="mr-3 h-4 w-4 text-green-600 rounded focus:ring-green-500"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-800">
                                {dt.label}
                              </span>
                              <span className="text-xs text-gray-400 break-all">{fullTopic}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tópicos Personalizados (Opcional)
                    </label>
                    {topicosAdicionales.map((topico, index) => (
                      <div key={index} className="mb-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Tópico (se añade al prefijo global)</label>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 relative">
                                <input
                                  type="text"
                                  value={topico.topic}
                                  onChange={(e) => {
                                    const newTopicos = [...topicosAdicionales];
                                    newTopicos[index] = { ...topico, topic: e.target.value };
                                    setTopicosAdicionales(newTopicos);
                                  }}
                                  placeholder="ej: mi_sensor_extra"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  style={{
                                    paddingLeft: normalizedPrefix ? `${(normalizedPrefix.length * 8) + 24}px` : '12px'
                                  }}
                                />
                                {normalizedPrefix && (
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">
                                    {normalizedPrefix}/
                                  </span>
                                )}
                              </div>
                              {topicosAdicionales.length > 1 && (
                                <Button
                                  type="button"
                                  onClick={() => setTopicosAdicionales(topicosAdicionales.filter((_, i) => i !== index))}
                                  color="danger"
                                  size="sm"
                                  variant="solid"
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Tópico completo: <code className="bg-gray-100 px-1 rounded text-xs">
                                {normalizedPrefix ? `${normalizedPrefix}/${topico.topic || 'mi_sensor_extra'}` : topico.topic || 'mi_sensor_extra'}
                              </code>
                            </p>
                          </div>
                          <Input
                            label="Valor Mínimo"
                            type="number"
                            value={String(topico.min || '')}
                            onChange={(e) => {
                              const newTopicos = [...topicosAdicionales];
                              newTopicos[index] = { ...topico, min: e.target.value ? Number(e.target.value) : undefined };
                              setTopicosAdicionales(newTopicos);
                            }}
                            placeholder="ej: 0"
                            fullWidth
                            size="sm"
                          />
                          <Input
                            label="Valor Máximo"
                            type="number"
                            value={String(topico.max || '')}
                            onChange={(e) => {
                              const newTopicos = [...topicosAdicionales];
                              newTopicos[index] = { ...topico, max: e.target.value ? Number(e.target.value) : undefined };
                              setTopicosAdicionales(newTopicos);
                            }}
                            placeholder="ej: 100"
                            fullWidth
                            size="sm"
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      onClick={() => setTopicosAdicionales([...topicosAdicionales, {topic: '', min: undefined, max: undefined}])}
                      color="success"
                      variant="light"
                      size="sm"
                      startContent="+"
                    >
                      Añadir otro tópico
                    </Button>
                  </div>
                </div>
              </div>

              {/* Autenticación */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
                <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Autenticación (Opcional)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Usuario"
                    value={formData.usuario}
                    onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                    placeholder="Usuario"
                    fullWidth
                  />
                  <Input
                    label="Contraseña"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Contraseña"
                    fullWidth
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={onClose}
                  color="default"
                  variant="light"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  color="primary"
                >
                  {broker ? 'Actualizar' : 'Guardar y Configurar'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}