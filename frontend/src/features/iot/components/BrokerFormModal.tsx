import { useState, useEffect } from 'react';
import { Server, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  Select,
  SelectItem,
  Checkbox,
  Card,
  CardHeader,
  CardBody,
  Divider,
} from "@heroui/react";
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
  const [topicosAdicionales, setTopicosAdicionales] = useState<Array<{ topic: string, min?: number, max?: number }>>([{ topic: '', min: undefined, max: undefined }]);

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

        const additional: Array<{ topic: string, min?: number, max?: number }> = [];
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
              additional.push({ topic: cleanTopic, min: undefined, max: undefined });
            } else {
              additional.push({ topic: cleanTopic, min: t.min, max: t.max });
            }
          }
        });
        setDefaultTopicsEnabled(enabled);
        setTopicosAdicionales(additional.length > 0 ? additional : [{ topic: '', min: undefined, max: undefined }]);
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
        setTopicosAdicionales([{ topic: '', min: undefined, max: undefined }]);
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

  const handleSubmit = async (e: React.FormEvent | null) => {
    if (e) e.preventDefault();

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

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="5xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Server className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{broker ? 'Editar Broker' : 'Nuevo Broker'}</h3>
                  <p className="text-small text-default-500 font-normal">Configuración de conexión MQTT y Tópicos</p>
                </div>
              </div>
            </ModalHeader>
            <ModalBody>
              <form id="broker-form" onSubmit={handleSubmit} className="space-y-6">

                {/* SECCIÓN 1: Información del Broker */}
                <Card shadow="sm" className="border border-default-200">
                  <CardHeader className="flex gap-2 bg-default-50/50 pb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-small font-bold text-default-700">Información de Conexión</span>
                  </CardHeader>
                  <Divider />
                  <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nombre"
                      placeholder="Nombre del broker"
                      value={formData.nombre}
                      onValueChange={(val) => setFormData({ ...formData, nombre: val })}
                      isRequired
                      variant="bordered"
                    />
                    <Select
                      label="Protocolo"
                      placeholder="Selecciona un protocolo"
                      selectedKeys={[formData.protocolo]}
                      onChange={(e) => setFormData({ ...formData, protocolo: e.target.value as any })}
                      isRequired
                      variant="bordered"
                    >
                      <SelectItem key="mqtt" textValue="MQTT (mqtt://)">MQTT (mqtt://)</SelectItem>
                      <SelectItem key="mqtts" textValue="MQTT SSL (mqtts://)">MQTT SSL (mqtts://)</SelectItem>
                      <SelectItem key="http" textValue="HTTP (http://)">HTTP (http://)</SelectItem>
                      <SelectItem key="https" textValue="HTTPS (https://)">HTTPS (https://)</SelectItem>
                      <SelectItem key="ws" textValue="WebSocket (ws://)">WebSocket (ws://)</SelectItem>
                      <SelectItem key="wss" textValue="WebSocket SSL (wss://)">WebSocket SSL (wss://)</SelectItem>
                    </Select>

                    <Input
                      label="Host"
                      placeholder="ej: test.mosquitto.org"
                      value={formData.host}
                      onValueChange={(val) => setFormData({ ...formData, host: val })}
                      isRequired
                      variant="bordered"
                    />
                    <Input
                      label="Puerto"
                      placeholder="1883"
                      type="number"
                      value={formData.puerto}
                      onValueChange={(val) => setFormData({ ...formData, puerto: val })}
                      isRequired
                      variant="bordered"
                    />

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Select
                        label="Lote"
                        placeholder="Seleccionar lote"
                        selectedKeys={formData.loteId ? [formData.loteId] : []}
                        onChange={(e) => setFormData({ ...formData, loteId: e.target.value })}
                        isRequired
                        variant="bordered"
                      >
                        {lotes.map((lote) => (
                          <SelectItem key={String(lote.id)} textValue={lote.nombre}>{lote.nombre}</SelectItem>
                        ))}
                      </Select>
                      <Input
                        label="Prefijo Global"
                        placeholder="ej: agrotech"
                        value={formData.prefijoTopicos}
                        onValueChange={(val) => setFormData({ ...formData, prefijoTopicos: val })}
                        variant="bordered"
                      />
                      <Button
                        color="success"
                        variant="ghost"
                        className="h-full min-h-[56px]"
                        startContent={<Wifi size={18} />}
                        onPress={handleTestConnection}
                        isLoading={isTestingConnection}
                        isDisabled={!formData.host || !formData.puerto || !formData.loteId}
                      >
                        {isTestingConnection ? 'Probando...' : 'Probar Conexión'}
                      </Button>
                    </div>
                  </CardBody>
                </Card>

                {/* SECCIÓN 2: Configuración de Tópicos */}
                <Card shadow="sm" className="border border-green-200 bg-green-50/20">
                  <CardHeader className="flex gap-2 pb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-small font-bold text-green-900">Configuración de Tópicos</span>
                  </CardHeader>
                  <Divider className="bg-green-100" />
                  <CardBody className="space-y-6">
                    {/* Default Topics */}
                    <div>
                      <h5 className="text-small font-bold text-default-600 mb-3">Dispositivos Predeterminados</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {defaultTopicsConfig.map((dt) => {
                          const fullTopic = normalizedPrefix ? `${normalizedPrefix}/${dt.key}` : dt.key;
                          return (
                            <div key={dt.key} className={`flex items-start p-3 rounded-lg border transition-colors ${defaultTopicsEnabled[dt.key] ? 'bg-white border-green-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-default-100'}`}>
                              <Checkbox
                                isSelected={defaultTopicsEnabled[dt.key]}
                                onValueChange={(isSelected) => setDefaultTopicsEnabled(prev => ({ ...prev, [dt.key]: isSelected }))}
                                classNames={{ label: "flex flex-col gap-1" }}
                                size="sm"
                                color="success"
                              >
                                <span className="font-semibold text-gray-800">{dt.label}</span>
                                <span className="text-tiny text-gray-400 font-mono break-all">{fullTopic}</span>
                              </Checkbox>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Topics */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-small font-bold text-default-600">Tópicos Personalizados</h5>
                        <Button
                          size="sm"
                          color="primary"
                          variant="flat"
                          onPress={() => setTopicosAdicionales([...topicosAdicionales, { topic: '', min: undefined, max: undefined }])}
                          startContent={<span>+</span>}
                        >
                          Añadir Tópico
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {topicosAdicionales.map((topico, index) => (
                          <div key={index} className="flex flex-col md:flex-row gap-3 p-3 bg-white rounded-lg border border-default-200">
                            <div className="flex-1">
                              <Input
                                size="sm"
                                label="Tópico"
                                placeholder="ej: mi_sensor_extra"
                                value={topico.topic}
                                onValueChange={(val) => {
                                  const newTopicos = [...topicosAdicionales];
                                  newTopicos[index] = { ...topico, topic: val };
                                  setTopicosAdicionales(newTopicos);
                                }}
                                startContent={
                                  normalizedPrefix ? <span className="text-default-400 text-small">{normalizedPrefix}/</span> : null
                                }
                              />
                            </div>
                            <div className="w-full md:w-24">
                              <Input
                                size="sm"
                                type="number"
                                label="Min"
                                placeholder="0"
                                value={String(topico.min || '')}
                                onValueChange={(val) => {
                                  const newTopicos = [...topicosAdicionales];
                                  newTopicos[index] = { ...topico, min: val ? Number(val) : undefined };
                                  setTopicosAdicionales(newTopicos);
                                }}
                              />
                            </div>
                            <div className="w-full md:w-24">
                              <Input
                                size="sm"
                                type="number"
                                label="Max"
                                placeholder="100"
                                value={String(topico.max || '')}
                                onValueChange={(val) => {
                                  const newTopicos = [...topicosAdicionales];
                                  newTopicos[index] = { ...topico, max: val ? Number(val) : undefined };
                                  setTopicosAdicionales(newTopicos);
                                }}
                              />
                            </div>
                            {topicosAdicionales.length > 1 && (
                              <Button
                                isIconOnly
                                size="sm"
                                color="danger"
                                variant="light"
                                onPress={() => setTopicosAdicionales(topicosAdicionales.filter((_, i) => i !== index))}
                                className="self-center"
                              >
                                ✕
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* SECCIÓN 3: Autenticación */}
                <Card shadow="sm" className="border border-purple-200 bg-purple-50/20">
                  <CardHeader className="flex gap-2 pb-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-small font-bold text-purple-900">Autenticación (Opcional)</span>
                  </CardHeader>
                  <Divider className="bg-purple-100" />
                  <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Usuario"
                      placeholder="Usuario MQTT"
                      value={formData.usuario}
                      onValueChange={(val) => setFormData({ ...formData, usuario: val })}
                      variant="bordered"
                      className="bg-white"
                    />
                    <Input
                      label="Contraseña"
                      type="password"
                      placeholder="Contraseña MQTT"
                      value={formData.password}
                      onValueChange={(val) => setFormData({ ...formData, password: val })}
                      variant="bordered"
                      className="bg-white"
                    />
                  </CardBody>
                </Card>

              </form>
            </ModalBody>
            <ModalFooter>
              <Button onPress={onClose} variant="light" color="default">
                Cancelar
              </Button>
              <Button className="bg-green-600 text-white font-bold hover:bg-green-700" onPress={() => handleSubmit(null)} type="submit" form="broker-form">
                {broker ? 'Actualizar' : 'Guardar y Configurar'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}