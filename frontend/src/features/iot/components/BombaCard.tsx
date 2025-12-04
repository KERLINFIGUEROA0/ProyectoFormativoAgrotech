import { useMemo, useEffect, useState } from 'react';
import { Card, CardBody, Chip } from "@heroui/react";
import { useMqttSocket } from '../hooks/useMqttSocket';
import type { LatestSensorData } from '../interfaces/iot';

interface BombaCardProps {
  topicCommand?: string;
}

export const BombaCard = ({ topicCommand }: BombaCardProps) => {
  const { latestReadings, isConnected } = useMqttSocket();
  const [isWatchdogActive, setIsWatchdogActive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 1. Buscar el sensor de la bomba en los datos
  const bombaData = useMemo(() => {
    return latestReadings.find((s: LatestSensorData) =>
      s.topic === topicCommand ||
      s.topic?.includes('sensores/bomba') || // Coincide con tu nuevo tópico
      s.nombre?.toLowerCase().includes('bomba')
    );
  }, [latestReadings, topicCommand]);

  // DEBUG: Log para verificar el nombre del sensor bomba en BombaCard
  useEffect(() => {
    if (bombaData) {
      console.log('DEBUG BombaCard - Nombre del sensor bomba:', bombaData.nombre);
    }
  }, [bombaData]);

  // 2. Verificar si hay sensores de humedad desconectados
  const humedadDesconectada = useMemo(() => {
    return latestReadings.some((s: LatestSensorData) =>
      s.nombre?.toLowerCase().includes('humedad') && s.estado === 'Desconectado'
    );
  }, [latestReadings]);

  // 2. Watchdog: Actualizar "última vez visto"
  useEffect(() => {
    if (bombaData) {
      setLastUpdate(new Date());
      setIsWatchdogActive(true);
    }
  }, [bombaData]);

  // 3. Watchdog: Verificar desconexión (Si pasan 12s sin datos -> Desconectado)
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = (new Date().getTime() - lastUpdate.getTime()) / 1000;
      if (diff > 12) {
        setIsWatchdogActive(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  // 4. Lógica de Estado: 1 = ON, 0 = OFF
  const valor = Number(bombaData?.valor);
  const isOn = valor === 1 && !humedadDesconectada; // Si humedad desconectada, bomba se apaga
  const isOnline = isConnected && isWatchdogActive && bombaData !== undefined && !humedadDesconectada;

  return (
    // Diseño ultra compacto
    <Card className={`shadow-sm hover:shadow-md transition-all duration-300 border ${isOnline && isOn ? 'border-blue-500' : 'border-gray-200'}`}>
      <CardBody className="p-2 flex flex-col items-center justify-center text-center">

        {/* Título */}
        <p className="text-xs font-medium text-gray-500 mb-1">Bomba</p>

        {/* Estado Principal */}
        <h3 className={`text-xl font-bold mb-1 ${isOnline && isOn ? 'text-blue-600' : 'text-gray-700'}`}>
          {isOn ? "ON" : "OFF"}
        </h3>

        {/* Estado de Conexión */}
        <Chip
          size="sm"
          color={!isOnline ? "danger" : (isOn ? "primary" : "default")}
          variant="flat"
          className="text-[10px] px-2 py-0.5"
        >
          {!isOnline ? "DESCONECTADO" : (isOn ? "ON" : "OFF")}
        </Chip>

      </CardBody>
    </Card>
  );
};