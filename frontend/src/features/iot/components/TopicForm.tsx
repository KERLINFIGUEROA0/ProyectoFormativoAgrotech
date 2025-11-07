import { useState, type ReactElement } from 'react';
import { Input, Button } from "@heroui/react";
import { toast } from "sonner";
import type { CreateSubscripcionDto } from '../interfaces/iot';

interface TopicFormProps {
  brokerId: number;
  onSave: (data: CreateSubscripcionDto) => void;
  onCancel: () => void;
}

export default function TopicForm({ brokerId, onSave, onCancel }: TopicFormProps): ReactElement {
  const [topic, setTopic] = useState('');
  const [qos, setQos] = useState<0 | 1 | 2>(0);

  const handleSubmit = () => {
    if (!topic.trim()) {
      toast.error("El tópico es requerido.");
      return;
    }

    onSave({
      brokerId,
      topic,
      qos,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <Input
        label="Tópico MQTT *"
        name="topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Ej: mi_casa/sala/temperatura"
        fullWidth
      />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">QoS (Calidad de Servicio) *</span>
        <select
          name="qos"
          value={qos}
          onChange={(e) => setQos(Number(e.target.value) as 0 | 1 | 2)}
          className="border border-gray-300 rounded-md p-2 bg-white"
        >
          <option value={0}>0 - Máximo una vez</option>
          <option value={1}>1 - Al menos una vez</option>
          <option value={2}>2 - Exactamente una vez</option>
        </select>
      </label>

      <div className="flex justify-end gap-3 mt-4">
        <Button onClick={onCancel} color="danger" variant="light">Cancelar</Button>
        <Button onClick={handleSubmit} color="success">Añadir Tópico</Button>
      </div>
    </div>
  );
}