import { useState, useEffect, type ReactElement } from 'react';
import { Input, Button, Select, SelectItem } from "@heroui/react";
import { toast } from "sonner";
import { probarConexionBroker } from '../api/mqttConfigApi';
import type { Sensor, Surco } from '../interfaces/iot';

type SensorFormData = Partial<Omit<Sensor, 'surco'>> & {
  surcoId?: number;
  // Campos del broker
  brokerNombre?: string;
  brokerHost?: string;
  brokerPuerto?: number;
  brokerProtocolo?: string;
  brokerUsuario?: string;
  brokerPassword?: string;
  // Campo para configuración JSON
  json_key?: string;
};

interface SensorFormProps {
  initialData?: Partial<Sensor>;
  surcos: Surco[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function SensorForm({ initialData = {}, surcos, onSave, onCancel }: SensorFormProps): ReactElement {
  const [formData, setFormData] = useState<SensorFormData>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  useEffect(() => {
    const flatData: SensorFormData = {
      id: initialData.id,
      nombre: initialData.nombre,
      estado: initialData.estado,
      fecha_instalacion: initialData.fecha_instalacion,
      valor_minimo_alerta: initialData.valor_minimo_alerta,
      valor_maximo_alerta: initialData.valor_maximo_alerta,
      topic: initialData.topic,
      json_key: initialData.json_key || '', // Cargar valor inicial
      surcoId: initialData.surco?.id,
      // Datos del broker del surco (si existe)
    };

    setFormData(flatData);
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTestConnection = async () => {
    const { brokerNombre, brokerHost, brokerPuerto, brokerProtocolo, brokerUsuario, brokerPassword } = formData;

    if (!brokerNombre || !brokerHost || !brokerPuerto || !brokerProtocolo) {
      toast.error("Debes completar todos los campos del broker para probar la conexión.");
      return;
    }

    setIsTestingConnection(true);
    toast.info("Probando conexión con el broker MQTT...");

    try {
      // Necesitamos enviar `loteId` según CreateBrokerDto
      const surcoSeleccionado = surcos.find(s => s.id === Number(formData.surcoId));
      const loteId = surcoSeleccionado?.lote?.id;

      if (!loteId) {
        toast.error("Debes seleccionar un surco/lote antes de probar la conexión del broker.");
        setIsTestingConnection(false);
        return;
      }

      const brokerData = {
        nombre: brokerNombre,
        host: brokerHost,
        puerto: parseInt(String(brokerPuerto), 10),
        protocolo: brokerProtocolo,
        usuario: brokerUsuario || undefined,
        password: brokerPassword || undefined,
        loteId,
      };

      const result = await probarConexionBroker(brokerData);

      if (result.connected) {
        toast.success("✅ Conexión exitosa con el broker MQTT!");
      } else {
        toast.error(`❌ Error de conexión: ${result.message}`);
      }

    } catch (error: any) {
      toast.error(`❌ Error al probar conexión: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = () => {
    const {
      nombre,
      surcoId,
      fecha_instalacion,
      valor_minimo_alerta,
      valor_maximo_alerta,
      topic,
      brokerNombre,
      brokerHost,
      brokerPuerto,
      brokerProtocolo,
      brokerUsuario,
      brokerPassword
    } = formData;

    // Validamos campos requeridos del sensor
    if (!nombre || !surcoId || !fecha_instalacion || !valor_minimo_alerta || !valor_maximo_alerta || !topic) {
      toast.error("Todos los campos del sensor son requeridos, incluyendo el tópico MQTT.");
      return;
    }

    // Validamos campos requeridos del broker
    if (!brokerNombre || !brokerHost || !brokerPuerto || !brokerProtocolo) {
      toast.error("Todos los campos del broker son requeridos (nombre, host, puerto, protocolo).");
      return;
    }

    // Creamos el payload "limpio" que espera el backend
    const payload = {
      nombre,
      surcoId: parseInt(String(surcoId), 10),
      fecha_instalacion,
      valor_minimo_alerta: parseFloat(String(valor_minimo_alerta)),
      valor_maximo_alerta: parseFloat(String(valor_maximo_alerta)),
      topic: topic || null,
      json_key: formData.json_key || null, // Enviar al backend
      estado: formData.estado || 'Activo',
      // Información del broker
      broker: {
        nombre: brokerNombre,
        host: brokerHost,
        puerto: parseInt(String(brokerPuerto), 10),
        protocolo: brokerProtocolo,
        usuario: brokerUsuario || undefined,
        password: brokerPassword || undefined,
        loteId: (() => {
          const s = surcos.find(x => x.id === Number(surcoId));
          return s?.lote?.id || 0;
        })(),
      }
    };

    onSave(payload);
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-h-[70vh] overflow-y-auto">
      {/* Información Básica del Sensor */}
      <div className="border-b pb-4 mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Información del Sensor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nombre del Sensor *" name="nombre" value={formData.nombre || ''} onChange={handleChange} placeholder="Ej: Sensor Temperatura 01" fullWidth />

          <Select
            label="Ubicación (Surco) *"
            selectedKeys={formData.surcoId ? [formData.surcoId.toString()] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys);
              setFormData(prev => ({ ...prev, surcoId: selected.length > 0 ? Number(selected[0]) : undefined }));
            }}
            placeholder="Seleccionar surco"
            fullWidth
          >
            {surcos.map(surco => (
              <SelectItem key={surco.id.toString()}>{surco.nombre} (Lote: {surco.lote.nombre})</SelectItem>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Input label="Fecha de Instalación *" name="fecha_instalacion" type="date" value={formData.fecha_instalacion || ''} onChange={handleChange} fullWidth />

          <Input label="Valor Mínimo Alerta *" name="valor_minimo_alerta" type="number" value={String(formData.valor_minimo_alerta || '')} onChange={handleChange} placeholder="Ej: 10" fullWidth />

          <Input label="Valor Máximo Alerta *" name="valor_maximo_alerta" type="number" value={String(formData.valor_maximo_alerta || '')} onChange={handleChange} placeholder="Ej: 30" fullWidth />
        </div>
      </div>

      {/* Configuración MQTT */}
      <div className="border-b pb-4 mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuración de Lectura</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Tópico MQTT *"
              name="topic"
              value={formData.topic || ''}
              onChange={handleChange}
              placeholder="Ej: agrotech/sensores/lote1/temp"
              fullWidth
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Ruta donde el dispositivo publica los datos.
            </p>
          </div>

          {/* ✅ NUEVO INPUT: CLAVE JSON */}
          <div>
            <Input
              label="Clave JSON (Opcional)"
              name="json_key"
              value={formData.json_key || ''}
              onChange={handleChange}
              placeholder="Ej: temperatura"
              fullWidth
            />
            <p className="text-xs text-blue-500 mt-1">
              Si el dispositivo envía <code>{`{"temp": 24}`}</code>, escribe <b>temp</b> aquí.
              Déjalo vacío si envía solo el número.
            </p>
          </div>
        </div>
      </div>

      {/* Sección de Configuración del Broker */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuración del Broker MQTT</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre del Broker *"
            name="brokerNombre"
            value={formData.brokerNombre || ''}
            onChange={handleChange}
            placeholder="Ej: Broker Principal"
            fullWidth
            required
          />
          <Select
            label="Protocolo *"
            selectedKeys={[formData.brokerProtocolo || 'mqtt://']}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys);
              setFormData(prev => ({ ...prev, brokerProtocolo: String(selected[0]) || 'mqtt://' }));
            }}
            fullWidth
          >
            <SelectItem key="mqtt://">mqtt://</SelectItem>
            <SelectItem key="mqtts://">mqtts:// (SSL)</SelectItem>
            <SelectItem key="ws://">ws:// (WebSocket)</SelectItem>
            <SelectItem key="wss://">wss:// (WebSocket SSL)</SelectItem>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Input
            label="Host del Broker *"
            name="brokerHost"
            value={formData.brokerHost || ''}
            onChange={handleChange}
            placeholder="Ej: test.mosquitto.org"
            fullWidth
            required
          />
          <Input
            label="Puerto *"
            name="brokerPuerto"
            type="number"
            value={String(formData.brokerPuerto || 1883)}
            onChange={handleChange}
            placeholder="1883"
            fullWidth
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Input
            label="Usuario (Opcional)"
            name="brokerUsuario"
            value={formData.brokerUsuario || ''}
            onChange={handleChange}
            placeholder="Usuario MQTT"
            fullWidth
          />
          <Input
            label="Contraseña (Opcional)"
            name="brokerPassword"
            type="password"
            value={formData.brokerPassword || ''}
            onChange={handleChange}
            placeholder="Contraseña MQTT"
            fullWidth
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={handleTestConnection}
            color="primary"
            variant="bordered"
            isLoading={isTestingConnection}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? "Probando..." : "Probar Conexión"}
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          El broker se creará automáticamente y se asociará al surco seleccionado si no existe uno con el mismo nombre.
        </p>
      </div>
      
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <Button onClick={onCancel} color="danger" variant="light">Cancelar</Button>
        <Button onClick={handleSubmit} color="success">Guardar Sensor y Broker</Button>
      </div>
    </div>
  );
}