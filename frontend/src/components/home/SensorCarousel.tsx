import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@heroui/react';
import { Thermometer, Droplets, Wind, Sun, Activity, Wifi, WifiOff } from 'lucide-react';
import type { LatestSensorData } from '../../features/iot/interfaces/iot';

interface SensorCarouselProps {
  sensors: LatestSensorData[];
}

export const SensorCarousel: React.FC<SensorCarouselProps> = ({ sensors }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Lógica del Carrusel: Cambia de sensor cada 5 segundos
  useEffect(() => {
    if (!sensors || sensors.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % sensors.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [sensors.length]);

  // Si no hay datos, muestra un estado de carga
  if (!sensors || sensors.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-center text-gray-400">
        <span className="animate-pulse">Cargando sensores...</span>
      </div>
    );
  }

  const currentSensor = sensors[currentIndex];
  const nextSensor = sensors[(currentIndex + 1) % sensors.length];
  const prevSensor = sensors[(currentIndex - 1 + sensors.length) % sensors.length];

  // 🔴 AQUÍ ESTÁ LA LÓGICA QUE FALTABA:
  // Detectar si el sensor está caído
  const isOffline = currentSensor.estado === 'Desconectado';

  // --- Helpers de visualización ---
  const getSensorUnit = (sensor: LatestSensorData) => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';
    // Detectar si es bomba
    if (name.includes('bomba') || topic.includes('bomba')) return '';
    if (name.includes('temperatura') || topic.includes('temp')) return '°C';
    if (name.includes('humedad') || topic.includes('hum')) return '%';
    if (name.includes('luz') || topic.includes('luz') || name.includes('luminosidad')) return 'lux';
    if (name.includes('viento') || topic.includes('wind')) return 'km/h';
    return '';
  };

  const getSensorIcon = (sensor: LatestSensorData) => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';
    if (name.includes('temperatura') || topic.includes('temp')) return <Thermometer size={20} />;
    if (name.includes('humedad') || topic.includes('hum')) return <Droplets size={20} />;
    if (name.includes('luz') || topic.includes('luz')) return <Sun size={20} />;
    if (name.includes('viento') || topic.includes('wind')) return <Wind size={20} />;
    return <Activity size={20} />;
  };

  const getSensorColor = (sensor: LatestSensorData, isOffline: boolean) => {
    if (isOffline) return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-400' };

    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';
    const isBomba = name.includes('bomba') || topic.includes('bomba');

    if (isBomba) {
      const valor = Number(sensor.valor);
      return valor === 1
        ? { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' }
        : { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500' };
    }

    if (name.includes('temp')) return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' };
    if (name.includes('hum')) return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' };
    if (name.includes('luz')) return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' };
    return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' };
  };

  const getSensorPercentage = (sensor: LatestSensorData) => {
    if (sensor.estado === 'Desconectado') return 0;

    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';
    const valor = Number(sensor.valor) || 0;

    if (name.includes('bomba') || topic.includes('bomba')) {
      return valor === 1 ? 100 : 0;
    }

    if (name.includes('humedad') || topic.includes('hum')) {
      return Math.min(Math.max(valor, 0), 100); // Already percentage
    }

    if (name.includes('temperatura') || topic.includes('temp')) {
      // Normalize temperature (assuming 0-50°C range)
      return Math.min(Math.max((valor / 50) * 100, 0), 100);
    }

    if (name.includes('luz') || topic.includes('luz')) {
      // Normalize light (assuming 0-1000 lux range)
      return Math.min(Math.max((valor / 1000) * 100, 0), 100);
    }

    if (name.includes('viento') || topic.includes('wind')) {
      // Normalize wind (assuming 0-20 km/h range)
      return Math.min(Math.max((valor / 20) * 100, 0), 100);
    }

    return 50; // Default
  };

  const SensorCard: React.FC<{ sensor: LatestSensorData; isActive: boolean }> = ({ sensor, isActive }) => {
    const offline = sensor.estado === 'Desconectado';
    const colors = getSensorColor(sensor, offline);
    const unit = getSensorUnit(sensor);
    const icon = getSensorIcon(sensor);
    const percentage = getSensorPercentage(sensor);

    const getValue = () => {
      if (offline) return '0';
      const name = sensor.nombre.toLowerCase();
      const topic = sensor.topic?.toLowerCase() || '';
      const isBomba = name.includes('bomba') || topic.includes('bomba');
      if (isBomba) {
        return Number(sensor.valor) === 1 ? 'ON' : 'OFF';
      }
      return sensor.valor ?? '--';
    };

    const circumference = 2 * Math.PI * 70; // radius 70
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <motion.div
        className="relative flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
      >
        {/* Circular Progress Ring */}
        <svg className="absolute w-56 h-56 transform -rotate-90" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r="70"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            className={`${offline ? 'text-gray-400' : colors.text.replace('text-', '')}`}
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </svg>

        {/* Main Circular Card */}
        <motion.div
          className={`w-40 h-40 rounded-full ${colors.bg} ${colors.border} border-4 shadow-xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden z-10`}
          whileHover={{
            boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.25)",
            transition: { duration: 0.3 }
          }}
        >
          {/* Background pattern for agricultural theme */}
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full bg-gradient-to-br from-green-200 to-blue-200 rounded-full"></div>
          </div>

          {/* Status indicator */}
          <div className="absolute top-2 right-2">
            <div className={`w-3 h-3 rounded-full ${offline ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
          </div>

          {/* Icon */}
          <motion.div
            className={`p-2 rounded-full bg-white shadow-md mb-1 ${colors.text}`}
            whileHover={{ scale: 1.1 }}
          >
            {icon}
          </motion.div>

          {/* Name */}
          <h4 className={`text-xs font-semibold text-center px-1 ${offline ? 'text-gray-500' : 'text-gray-800'}`}>
            {sensor.nombre}
          </h4>

          {/* Value */}
          <div className="text-center">
            <span className={`text-sm font-bold ${offline ? 'text-gray-400' : colors.text}`}>
              {getValue()}
            </span>
            {unit && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
          </div>

          {/* Percentage */}
          <div className="text-xs text-gray-500 mt-1">
            {percentage.toFixed(0)}%
          </div>

          {/* Connection status */}
          <div className="absolute bottom-1 flex items-center gap-1 text-xs">
            {offline ? <WifiOff size={8} className="text-red-500" /> : <Wifi size={8} className="text-green-500" />}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="relative w-full h-64 flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 rounded-xl overflow-hidden">
      {/* Agricultural background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Counter */}
      <div className="absolute top-4 right-4 z-20">
        <Badge variant="flat" className="text-xs text-gray-600 bg-white/80">
          {currentIndex + 1} / {sensors.length}
        </Badge>
      </div>

      {/* Sensor Card */}
      <AnimatePresence mode="wait" custom={currentIndex}>
        <motion.div
          key={currentSensor.id}
          custom={currentIndex}
          initial={{ x: 300, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: -300, opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute"
        >
          <SensorCard sensor={currentSensor} isActive={true} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SensorCarousel;