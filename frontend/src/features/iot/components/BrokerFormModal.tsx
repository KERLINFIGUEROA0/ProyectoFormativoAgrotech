import { useState, useEffect } from 'react';
import { Server, X, Wifi } from 'lucide-react';
import { toast } from 'sonner';
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
  { key: 'sensores/luz', label: 'Luminosidad (Lux)' },
  { key: 'sensores/humedad_suelo', label: 'Humedad Suelo' }
];

export default function BrokerFormModal({ isOpen, onClose, onSuccess, broker, brokers }: BrokerFormModalProps) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [topicosAdicionales, setTopicosAdicionales] = useState<Array<{topic: string, min?: number, max?: number}>>([{topic: '', min: undefined, max: undefined}]);

  // 2. ESTADO INICIAL (Marcados por defecto)
  const [defaultTopicsEnabled, setDefaultTopicsEnabled] = useState<Record<string, boolean>>({
    'sensores/temperatura': true,
    'sensores/humedad': true,
    'sensores/luz': true,
    'sensores/humedad_suelo': true
  });

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showBrokerList, setShowBrokerList] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    protocolo: 'mqtt://',
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

      if (!broker && brokers && brokers.length > 0) {
        setShowBrokerList(true);
      } else {
        setShowBrokerList(false);
      }

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
          protocolo: broker.protocolo,
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
          protocolo: 'mqtt://',
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                      placeholder="Nombre del broker"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Protocolo</label>
                    <select
                      value={formData.protocolo}
                      onChange={(e) => setFormData({ ...formData, protocolo: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                    >
                      <option value="mqtt://">mqtt://</option>
                      <option value="mqtts://">mqtts://</option>
                      <option value="ws://">ws://</option>
                      <option value="wss://">wss://</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Host</label>
                    <input
                      type="text"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                      placeholder="ej: test.mosquitto.org"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Puerto</label>
                    <input
                      type="number"
                      value={formData.puerto}
                      onChange={(e) => setFormData({ ...formData, puerto: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                      placeholder="1883"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lote *</label>
                    <select
                      value={formData.loteId}
                      onChange={(e) => setFormData({ ...formData, loteId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                      required
                    >
                      <option value="">Seleccionar lote</option>
                      {lotes.map((lote) => (
                        <option key={lote.id} value={lote.id}>{lote.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prefijo Global</label>
                    <input
                      type="text"
                      value={formData.prefijoTopicos}
                      onChange={(e) => setFormData({ ...formData, prefijoTopicos: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                      placeholder="ej: agrotech"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || !formData.host || !formData.puerto || !formData.loteId}
                      className="w-full px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md text-sm transition-colors flex items-center justify-center gap-1"
                    >
                      <Wifi size={14} />
                      {isTestingConnection ? 'Probando...' : 'Probar Conexión'}
                    </button>
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
                        const isPump = dt.key.includes('bomba');

                        return (
                          <label key={dt.key} className={`flex items-center p-2 rounded-md transition-colors cursor-pointer ${defaultTopicsEnabled[dt.key] ? (isPump ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200') : 'hover:bg-gray-50'}`}>
                            <input
                              type="checkbox"
                              checked={defaultTopicsEnabled[dt.key]}
                              onChange={(e) => setDefaultTopicsEnabled(prev => ({ ...prev, [dt.key]: e.target.checked }))}
                              className="mr-3 h-4 w-4 text-green-600 rounded focus:ring-green-500"
                            />
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${isPump ? 'text-blue-800' : 'text-gray-800'}`}>
                                {dt.label} {isPump && '💧'}
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
                            <div className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-100 text-gray-500 text-sm">
                                {normalizedPrefix ? `${normalizedPrefix}/` : ''}
                              </span>
                              <input
                                type="text"
                                value={topico.topic}
                                onChange={(e) => {
                                  const newTopicos = [...topicosAdicionales];
                                  newTopicos[index] = { ...topico, topic: e.target.value };
                                  setTopicosAdicionales(newTopicos);
                                }}
                                className="flex-1 w-full border border-gray-300 rounded-r-md px-2 py-1.5 text-sm"
                                placeholder="ej: mi_sensor_extra"
                              />
                              {topicosAdicionales.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setTopicosAdicionales(topicosAdicionales.filter((_, i) => i !== index))}
                                  className="ml-2 px-2 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Valor Mínimo</label>
                            <input
                              type="number"
                              value={topico.min || ''}
                              onChange={(e) => {
                                const newTopicos = [...topicosAdicionales];
                                newTopicos[index] = { ...topico, min: e.target.value ? Number(e.target.value) : undefined };
                                setTopicosAdicionales(newTopicos);
                              }}
                              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                              placeholder="ej: 0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Valor Máximo</label>
                            <input
                              type="number"
                              value={topico.max || ''}
                              onChange={(e) => {
                                const newTopicos = [...topicosAdicionales];
                                newTopicos[index] = { ...topico, max: e.target.value ? Number(e.target.value) : undefined };
                                setTopicosAdicionales(newTopicos);
                              }}
                              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                              placeholder="ej: 100"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTopicosAdicionales([...topicosAdicionales, {topic: '', min: undefined, max: undefined}])}
                      className="text-sm text-green-700 hover:text-green-900 font-medium flex items-center gap-1"
                    >
                      + Añadir otro tópico
                    </button>
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
                  <input
                    type="text"
                    value={formData.usuario}
                    onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                    placeholder="Usuario"
                  />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                    placeholder="Contraseña"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm"
                >
                  {broker ? 'Actualizar' : 'Guardar y Configurar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}