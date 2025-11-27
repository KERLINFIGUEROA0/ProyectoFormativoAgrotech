import { motion } from 'framer-motion';
import { Card, CardBody } from '@heroui/react';
import { Thermometer, Droplets, Wind, Sun, Activity, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { LatestSensorData } from '../../features/iot/interfaces/iot';

interface SensorCarouselProps {
  sensors: LatestSensorData[];
  loading: boolean;
}

const getSensorIcon = (nombre: string) => {
  const lowerName = nombre.toLowerCase();
  if (lowerName.includes('temperatura') || lowerName.includes('temp')) {
    return <Thermometer size={20} className="text-orange-500" />;
  }
  if (lowerName.includes('humedad') || lowerName.includes('humidity')) {
    return <Droplets size={20} className="text-blue-500" />;
  }
  if (lowerName.includes('viento') || lowerName.includes('wind')) {
    return <Wind size={20} className="text-gray-500" />;
  }
  if (lowerName.includes('solar') || lowerName.includes('radiación')) {
    return <Sun size={20} className="text-yellow-500" />;
  }
  return <Activity size={20} className="text-green-500" />;
};

const getSensorColor = (nombre: string) => {
  const lowerName = nombre.toLowerCase();
  if (lowerName.includes('temperatura') || lowerName.includes('temp')) {
    return 'border-orange-200 bg-orange-50';
  }
  if (lowerName.includes('humedad') || lowerName.includes('humidity')) {
    return 'border-blue-200 bg-blue-50';
  }
  if (lowerName.includes('viento') || lowerName.includes('wind')) {
    return 'border-gray-200 bg-gray-50';
  }
  if (lowerName.includes('solar') || lowerName.includes('radiación')) {
    return 'border-yellow-200 bg-yellow-50';
  }
  return 'border-green-200 bg-green-50';
};

export default function SensorCarousel({ sensors, loading }: SensorCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (sensors.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % sensors.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [sensors.length]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-3">
          <Activity className="text-purple-600" size={24} />
          Monitoreo de Sensores IoT
        </h3>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[280px] bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="w-20 h-6 bg-gray-200 rounded mb-2"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sensors.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-3">
          <Activity className="text-purple-600" size={24} />
          Monitoreo de Sensores IoT
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Activity size={48} className="mx-auto mb-3 opacity-50" />
          <p>No hay datos de sensores disponibles</p>
        </div>
      </div>
    );
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % sensors.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + sensors.length) % sensors.length);
  };

  const currentSensor = sensors[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="bg-white rounded-lg p-3 shadow-sm border border-gray-100"
    >
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <Activity className="text-purple-600" size={16} />
        Sensores IoT
        <span className="text-xs text-gray-500 font-normal">({sensors.length})</span>
      </h3>

      <div className="relative">
        <div className="flex items-center justify-center gap-4 mb-3">
          <button
            onClick={prevSlide}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex gap-2">
            {sensors.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <motion.div
          key={currentSensor.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <Card className={`w-full max-w-sm ${getSensorColor(currentSensor.nombre)} border-2`}>
            <CardBody className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getSensorIcon(currentSensor.nombre)}
                  <span className="font-semibold text-gray-800 text-sm">{currentSensor.nombre}</span>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Activo
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Valor actual:</span>
                  <span className="font-bold text-lg text-gray-900">
                    {currentSensor.valor ?? 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Rango normal:</span>
                  <span className="text-xs text-gray-700">
                    {currentSensor.valorMinimo} - {currentSensor.valorMaximo}
                  </span>
                </div>

                {currentSensor.fechaRegistro && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Actualización:</span>
                    <span className="text-xs text-gray-500">
                      {new Date(currentSensor.fechaRegistro).toLocaleString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>
                )}

                {currentSensor.valor && (
                  currentSensor.valor < currentSensor.valorMinimo || currentSensor.valor > currentSensor.valorMaximo
                ) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <AlertTriangle size={16} className="text-red-500" />
                    <span className="text-sm text-red-700">Valor fuera del rango normal</span>
                  </motion.div>
                )}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      <div className="mt-2 text-center text-xs text-gray-500">
        Auto-rotación cada 5s • {currentIndex + 1}/{sensors.length}
      </div>
    </motion.div>
  );
}