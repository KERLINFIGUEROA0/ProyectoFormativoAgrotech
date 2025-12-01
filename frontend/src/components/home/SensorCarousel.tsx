import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardBody, Badge } from '@heroui/react';
import { Thermometer, Droplets, Wind, Sun, Activity, Wifi } from 'lucide-react';
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
    }, 5000); // 5000ms = 5 segundos

    return () => clearInterval(interval);
  }, [sensors.length]); // Solo depende del número de sensores, no de los datos

  // Función para determinar la unidad del sensor
  const getSensorUnit = (sensor: LatestSensorData) => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';

    if (name.includes('temperatura') || topic.includes('temp')) return '°C';
    if (name.includes('humedad') || topic.includes('hum')) return '%';
    if (name.includes('luz') || topic.includes('luz') || name.includes('luminosidad')) return 'lux';
    if (name.includes('ph') || topic.includes('ph')) return '';
    if (name.includes('suelo') || topic.includes('soil')) return '%';
    if (name.includes('viento') || topic.includes('wind')) return 'km/h';
    return 'unidades'; // fallback
  };

  // Función para obtener el icono del sensor
  const getSensorIcon = (sensor: LatestSensorData) => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';

    if (name.includes('temperatura') || topic.includes('temp')) return <Thermometer size={24} />;
    if (name.includes('humedad') || topic.includes('hum')) return <Droplets size={24} />;
    if (name.includes('luz') || topic.includes('luz') || name.includes('luminosidad')) return <Sun size={24} />;
    if (name.includes('viento') || topic.includes('wind')) return <Wind size={24} />;
    if (name.includes('ph') || topic.includes('ph')) return <Activity size={24} />;
    return <Activity size={24} />;
  };

  // Función para obtener colores del icono del sensor (solo para el icono)
  const getSensorIconColor = (sensor: LatestSensorData) => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';

    if (name.includes('temperatura') || topic.includes('temp')) return 'text-orange-500';
    if (name.includes('humedad') || topic.includes('hum')) return 'text-blue-500';
    if (name.includes('luz') || topic.includes('luz') || name.includes('luminosidad')) return 'text-yellow-500';
    if (name.includes('viento') || topic.includes('wind')) return 'text-gray-500';
    return 'text-green-500';
  };

  // Si no hay datos, muestra un estado de carga o vacío
  if (!sensors || sensors.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-center text-gray-400">
        <span className="animate-pulse">Cargando sensores...</span>
      </div>
    );
  }

  const currentSensor = sensors[currentIndex];
  const unit = getSensorUnit(currentSensor);
  const sensorIcon = getSensorIcon(currentSensor);
  const iconColor = getSensorIconColor(currentSensor);

  // Animation variants for fade effect
  const fadeVariants = {
    enter: {
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    center: {
      opacity: 1,
      y: 0,
      scale: 1
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95
    }
  };

  return (
    <Card className="shadow-lg border-2 border-gray-100 hover:shadow-xl transition-shadow duration-300">
      <CardBody className="p-4">
        {/* Header with Live Indicator and Counter */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Badge color="success" variant="flat" className="text-xs px-2 py-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live
              </div>
            </Badge>
          </div>
          <Badge variant="flat" className="text-xs">
            {currentIndex + 1} / {sensors.length}
          </Badge>
        </div>

        {/* Main Sensor Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSensor.id}
            variants={fadeVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              opacity: { duration: 0.3 },
              y: { duration: 0.4 },
              scale: { duration: 0.4 }
            }}
            className="text-center"
          >
            {/* Sensor Icon */}
            <div className="flex justify-center mb-3">
              <div className={`p-3 bg-gray-50 rounded-full border-2 border-gray-100 ${iconColor}`}>
                {React.cloneElement(sensorIcon, { size: 24 })}
              </div>
            </div>

            {/* Sensor Name */}
            <h4 className="text-sm font-semibold text-gray-800 mb-2">
              {currentSensor.nombre}
            </h4>

            {/* Sensor Value Display */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 mb-3 border border-blue-100">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl font-bold text-gray-900">
                  {currentSensor.valor ?? '--'}
                </span>
                <span className="text-sm font-medium text-gray-600">
                  {unit}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Valor actual</p>
            </div>

            {/* Status indicators */}
            <div className="flex justify-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Wifi size={12} />
                <span>Conectado</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity size={12} />
                <span>Activo</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </CardBody>
    </Card>
  );
};

export default SensorCarousel;