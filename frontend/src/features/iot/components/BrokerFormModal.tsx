import { useState, useEffect } from 'react';
import { Server, X, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import type { Broker, Surco } from '../interfaces/iot';
import { listarSurcos, crearBroker, actualizarBroker, probarConexionBroker } from '../api/mqttConfigApi';

interface BrokerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  broker?: Broker | null;
}

const defaultTopics = ['luz', 'temperatura', 'humedad', 'humedad_suelo'];

export default function BrokerFormModal({ isOpen, onClose, onSuccess, broker }: BrokerFormModalProps) {
  const [surcos, setSurcos] = useState<Surco[]>([]);
  const [topicosAdicionales, setTopicosAdicionales] = useState<string[]>(['']);
  const [defaultTopicsEnabled, setDefaultTopicsEnabled] = useState<Record<string, boolean>>({
    luz: true,
    temperatura: true,
    humedad: true,
    humedad_suelo: true,
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    protocolo: 'mqtt://',
    host: '',
    puerto: '',
    surcoId: '',
    prefijoTopicos: '',
    usuario: '',
    password: '',
  });

  useEffect(() => {
    if (isOpen) {
      const cargarSurcos = async () => {
        try {
          const data = await listarSurcos();
          setSurcos(data);
        } catch (error) {
          console.error('Error cargando surcos:', error);
        }
      };
      cargarSurcos();

      // Si hay broker para editar, cargar sus datos
      if (broker) {
        setFormData({
          nombre: broker.nombre,
          protocolo: broker.protocolo,
          host: broker.host,
          puerto: broker.puerto.toString(),
          surcoId: broker.surco?.id.toString() || '',
          prefijoTopicos: broker.prefijoTopicos || '',
          usuario: broker.usuario || '',
          password: broker.password || '',
        });
        // Para tópicos adicionales, asumir que están en topicosAdicionales
        // Si no hay, dejar vacío
        // Para edición, determinar cuáles defaults están habilitados
        const enabled: Record<string, boolean> = { luz: false, temperatura: false, humedad: false, humedad_suelo: false };
        const additional: string[] = [];
        const prefix = broker.prefijoTopicos || '';
        broker.topicosAdicionales?.forEach(t => {
          if (t === prefix + 'luz') enabled.luz = true;
          else if (t === prefix + 'temperatura') enabled.temperatura = true;
          else if (t === prefix + 'humedad') enabled.humedad = true;
          else if (t === prefix + 'humedad_suelo') enabled.humedad_suelo = true;
          else additional.push(t.replace(prefix + '/', ''));
        });
        setDefaultTopicsEnabled(enabled);
        setTopicosAdicionales(additional.length > 0 ? additional : ['']);
      } else {
        // Reset para creación
        setFormData({
          nombre: '',
          protocolo: 'mqtt://',
          host: '',
          puerto: '',
          surcoId: '',
          prefijoTopicos: '',
          usuario: '',
          password: '',
        });
        setTopicosAdicionales(['']);
      }
    }
  }, [isOpen, broker]);

  // Normalizar el prefijo para que no empiece con '/' y no termine con '/', y sin múltiples '/'
  const normalizedPrefix = (formData.prefijoTopicos || '').replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/+/g, '/');

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const data = {
        nombre: formData.nombre,
        protocolo: formData.protocolo,
        host: formData.host,
        puerto: parseInt(formData.puerto),
        surcoId: formData.surcoId ? parseInt(formData.surcoId) : undefined,
        prefijoTopicos: normalizedPrefix || undefined,
        topicosAdicionales: [
          ...defaultTopics.filter(t => defaultTopicsEnabled[t]).map(t => normalizedPrefix ? `${normalizedPrefix}/${t}` : t),
          ...topicosAdicionales.filter(t => t.trim() !== '').map(t => normalizedPrefix ? `${normalizedPrefix}/${t}` : t)
        ],
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

    // Primero probar la conexión
    try {
      const testData = {
        nombre: formData.nombre,
        protocolo: formData.protocolo,
        host: formData.host,
        puerto: parseInt(formData.puerto),
        surcoId: formData.surcoId ? parseInt(formData.surcoId) : undefined,
        prefijoTopicos: normalizedPrefix || undefined,
        topicosAdicionales: [
          ...defaultTopics.filter(t => defaultTopicsEnabled[t]).map(t => normalizedPrefix ? `${normalizedPrefix}/${t}` : t),
          ...topicosAdicionales.filter(t => t.trim() !== '').map(t => normalizedPrefix ? `${normalizedPrefix}/${t}` : t)
        ],
        usuario: formData.usuario || undefined,
        password: formData.password || undefined,
      };

      const testResult = await probarConexionBroker(testData);
      if (!testResult.connected) {
        toast.error(`No se puede conectar al broker: ${testResult.message}. Verifique los datos e intente nuevamente.`);
        return;
      }
    } catch (error: any) {
      toast.error(`Error al verificar la conexión: ${error.message || 'Error desconocido'}`);
      return;
    }

    // Si la conexión es exitosa, proceder a guardar
    try {
      // Normalizar el prefijo para que no empiece con '/' y no termine con '/', y sin múltiples '/'
      let normalizedPrefix = (formData.prefijoTopicos || '').replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/+/g, '/');
      const data = {
        nombre: formData.nombre,
        protocolo: formData.protocolo,
        host: formData.host,
        puerto: parseInt(formData.puerto),
        surcoId: formData.surcoId ? parseInt(formData.surcoId) : undefined,
        prefijoTopicos: normalizedPrefix || undefined,
        topicosAdicionales: [
          ...defaultTopics.filter(t => defaultTopicsEnabled[t]).map(t => normalizedPrefix ? `${normalizedPrefix}/${t}` : t),
          ...topicosAdicionales.filter(t => t.trim() !== '').map(t => normalizedPrefix ? `${normalizedPrefix}/${t}` : t)
        ],
        usuario: formData.usuario || undefined,
        password: formData.password || undefined,
      };

      if (broker) {
        await actualizarBroker(broker.id, data);
        toast.success("Broker actualizado exitosamente.");
      } else {
        await crearBroker(data);
        toast.success("Broker creado exitosamente y sensores configurados.");
      }

      // Reset form solo si es creación
      if (!broker) {
        setFormData({
          nombre: '',
          protocolo: 'mqtt',
          host: '',
          puerto: '',
          surcoId: '',
          prefijoTopicos: '',
          usuario: '',
          password: '',
        });
        setDefaultTopicsEnabled({ luz: true, temperatura: true, humedad: true, humedad_suelo: true });
        setTopicosAdicionales(['']);
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
              <p className="text-sm text-gray-600">Complete toda la información requerida</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Información del Broker */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 animate-in slide-in-from-left-2 duration-400 delay-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2 animate-in slide-in-from-top-1 duration-300 delay-50">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-in scale-in duration-200 delay-25"></div>
                  Información del Broker
                </h4>
                {/* Primera fila: Nombre y Protocolo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Nombre del broker"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Protocolo
                    </label>
                    <select
                      value={formData.protocolo}
                      onChange={(e) => setFormData({ ...formData, protocolo: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="mqtt://">mqtt://</option>
                      <option value="mqtts://">mqtts://</option>
                      <option value="ws://">ws:// (WebSocket)</option>
                      <option value="wss://">wss:// (WebSocket Seguro)</option>
                      <option value="http://">http://</option>
                      <option value="https://">https://</option>
                    </select>
                  </div>
                </div>

                {/* Segunda fila: Host y Puerto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Host
                    </label>
                    <input
                      type="text"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="ej: test.mosquitto.org"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Puerto
                    </label>
                    <input
                      type="number"
                      value={formData.puerto}
                      onChange={(e) => setFormData({ ...formData, puerto: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="1883"
                      required
                    />
                  </div>
                </div>

                {/* Tercera fila: Surco, Prefijo y Botón */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Surco
                    </label>
                    <select
                      value={formData.surcoId}
                      onChange={(e) => setFormData({ ...formData, surcoId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Seleccionar surco (opcional)</option>
                      {surcos.map((surco) => (
                        <option key={surco.id} value={surco.id}>
                          {surco.nombre} - {surco.lote.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prefijo de Tópicos
                    </label>
                    <input
                      type="text"
                      value={formData.prefijoTopicos}
                      onChange={(e) => setFormData({ ...formData, prefijoTopicos: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="ej: sensor/"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || !formData.host || !formData.puerto}
                      className="w-full px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md text-sm transition-colors flex items-center justify-center gap-1"
                      title="Probar conexión al broker"
                    >
                      <Wifi size={14} />
                      {isTestingConnection ? 'Probando...' : 'Probar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Configuración de Tópicos */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100 animate-in slide-in-from-right-2 duration-400 delay-200">
                <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2 animate-in slide-in-from-top-1 duration-300 delay-150">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-in scale-in duration-200 delay-125"></div>
                  Configuración de Tópicos
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tópicos Predeterminados
                    </label>
                    <div className="space-y-2">
                      {defaultTopics.map((topic) => {
                        const fullTopic = normalizedPrefix ? `${normalizedPrefix}/${topic}` : topic;
                        return (
                          <label key={topic} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={defaultTopicsEnabled[topic]}
                              onChange={(e) => setDefaultTopicsEnabled(prev => ({ ...prev, [topic]: e.target.checked }))}
                              className="mr-2"
                            />
                            <span className="text-sm">{fullTopic}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tópicos Configurados
                    </label>
                    <ul className="list-disc list-inside text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      {[
                        ...defaultTopics.filter(t => defaultTopicsEnabled[t]).map(t => normalizedPrefix ? `${normalizedPrefix}/${t}` : t),
                        ...topicosAdicionales.filter(t => t.trim() !== '').map(t => normalizedPrefix ? `${normalizedPrefix}/${t}` : t)
                      ].map((topic) => (
                        <li key={topic}>{topic}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tópicos Adicionales
                    </label>
                    {topicosAdicionales.map((topico, index) => (
                      <div key={index} className="flex mb-2">
                        <input
                          type="text"
                          value={topico}
                          onChange={(e) => {
                            const newTopicos = [...topicosAdicionales];
                            newTopicos[index] = e.target.value;
                            setTopicosAdicionales(newTopicos);
                          }}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                          placeholder="ej: sensor/custom"
                        />
                        {topicosAdicionales.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setTopicosAdicionales(topicosAdicionales.filter((_, i) => i !== index))}
                            className="ml-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            -
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTopicosAdicionales([...topicosAdicionales, ''])}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                    >
                      + Agregar Tópico
                    </button>
                  </div>
                </div>
              </div>

              {/* Autenticación */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100 animate-in slide-in-from-bottom-2 duration-400 delay-300">
                <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2 animate-in slide-in-from-top-1 duration-300 delay-250">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-in scale-in duration-200 delay-225"></div>
                  Autenticación
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Usuario (opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.usuario}
                      onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      placeholder="Usuario"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contraseña (opcional)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      placeholder="Contraseña"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 animate-in slide-in-from-bottom-2 duration-400 delay-600">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors animate-in slide-in-from-left-3 duration-300 delay-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm animate-in slide-in-from-right-3 duration-300 delay-800"
                >
                  {broker ? 'Actualizar Broker' : 'Guardar Broker'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div> 
    </div>
  );
}