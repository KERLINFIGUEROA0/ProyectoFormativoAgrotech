import { useState, type ReactElement } from 'react';
import { Input, Button } from "@heroui/react";
import { toast } from "sonner";
import Modal from '../../../components/Modal';
import type { Sensor } from '../interfaces/iot';
import { actualizarSensor } from '../api/sensoresApi';

interface SensorLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sensors: Sensor[];
  onSuccess?: () => void;
}

export default function SensorLimitsModal({ isOpen, onClose, sensors, onSuccess }: SensorLimitsModalProps): ReactElement {
  const [limits, setLimits] = useState<Record<number, { min: number; max: number }>>({});
  const [saving, setSaving] = useState(false);

  // Convert percentage to actual value based on sensor type
  const convertPercentageToValue = (percentage: number, sensor: Sensor): number => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';

    if (name.includes('luz') || topic.includes('luz')) {
      // 0-100% -> 0-10000 lux, stored as 0-100
      return percentage;
    } else if (name.includes('temperatura') || topic.includes('temperatura')) {
      // 0-100% -> 0-50°C
      return (percentage / 100) * 50;
    } else if ((name.includes('humedad') && name.includes('suelo')) || (topic.includes('humedad') && topic.includes('suelo'))) {
      // Direct percentage
      return percentage;
    } else if (name.includes('humedad') || topic.includes('humedad')) {
      // Direct percentage
      return percentage;
    }
    return percentage;
  };

  // Get display unit for sensor
  const getUnit = (sensor: Sensor): string => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';

    if (name.includes('luz') || topic.includes('luz')) {
      return 'lux';
    } else if (name.includes('temperatura') || topic.includes('temperatura')) {
      return '°C';
    } else if ((name.includes('humedad') && name.includes('suelo')) || (topic.includes('humedad') && topic.includes('suelo'))) {
      return '%';
    } else if (name.includes('humedad') || topic.includes('humedad')) {
      return '%';
    }
    return '';
  };

  // Get current percentage from stored value
  const getCurrentPercentage = (sensor: Sensor, isMin: boolean): number => {
    const value = isMin ? sensor.valor_minimo_alerta : sensor.valor_maximo_alerta;
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';

    if (name.includes('luz') || topic.includes('luz')) {
      return value; // Already in percentage
    } else if (name.includes('temperatura') || topic.includes('temperatura')) {
      return (value / 50) * 100; // Convert °C to percentage
    } else {
      return value; // Already percentage
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = sensors.map(sensor => {
        const sensorLimits = limits[sensor.id];
        if (!sensorLimits) return null;

        const minValue = convertPercentageToValue(sensorLimits.min, sensor);
        const maxValue = convertPercentageToValue(sensorLimits.max, sensor);

        return actualizarSensor(sensor.id, {
          valor_minimo_alerta: minValue,
          valor_maximo_alerta: maxValue,
        });
      }).filter(Boolean);

      await Promise.all(updates);

      toast.success("Límites de sensores actualizados correctamente");
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error("Error al actualizar los límites de los sensores");
    } finally {
      setSaving(false);
    }
  };

  const handleLimitChange = (sensorId: number, field: 'min' | 'max', value: number) => {
    setLimits(prev => ({
      ...prev,
      [sensorId]: {
        ...prev[sensorId],
        [field]: value
      }
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurar Límites de Sensores" size="3xl">
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm text-gray-600 flex-1">
            Configura los límites de alerta para cada sensor en porcentaje. El sistema convertirá automáticamente los valores a las unidades apropiadas.
          </p>

          {/* Leyenda de Colores de Estado - Posición superior derecha */}
          <div className="flex items-center gap-3 p-2 bg-red-50 rounded-lg border border-red-200 ml-4">
            <span className="text-xs font-medium text-red-700">Estados:</span>

            {/* Alto - Rojo */}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs text-red-700 font-medium">Alto</span>
            </div>

            {/* Bajo - Azul */}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs text-red-700 font-medium">Bajo</span>
            </div>

            {/* Óptimo - Gris */}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-xs text-red-700 font-medium">Óptimo</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {sensors.map(sensor => {
            const currentMin = getCurrentPercentage(sensor, true);
            const currentMax = getCurrentPercentage(sensor, false);
            const unit = getUnit(sensor);

            return (
              <div key={sensor.id} className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-800 mb-2">{sensor.nombre}</h4>
                <p className="text-xs text-gray-500 mb-3">Tópico: {sensor.topic}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mínimo (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={String(limits[sensor.id]?.min ?? currentMin)}
                      onChange={(e) => handleLimitChange(sensor.id, 'min', Number(e.target.value))}
                      placeholder="0-100"
                      size="sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Equivale a {convertPercentageToValue(limits[sensor.id]?.min ?? currentMin, sensor).toFixed(1)} {unit}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Máximo (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={String(limits[sensor.id]?.max ?? currentMax)}
                      onChange={(e) => handleLimitChange(sensor.id, 'max', Number(e.target.value))}
                      placeholder="0-100"
                      size="sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Equivale a {convertPercentageToValue(limits[sensor.id]?.max ?? currentMax, sensor).toFixed(1)} {unit}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button onClick={onClose} color="danger" variant="light" disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} color="success" isLoading={saving} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Límites"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}