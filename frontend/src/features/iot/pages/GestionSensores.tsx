// src/features/iot/pages/GestionSensores.tsx
import { useState, useEffect, type ReactElement, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Bell, Thermometer, Droplet, Clock, AlertTriangle, X } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  listarSensores,
  crearSensor,
  actualizarSensor,
  eliminarSensor,
  listarTiposSensor,
  listarInformacionSensores
} from '../api/sensoresApi';
import { obtenerSurcosPorLote } from '../../cultivos/api/surcosApi';
import { obtenerLotes } from '../../cultivos/api/lotesApi';
import Modal from '../../../components/Modal';
import SensorForm from '../components/SensorForm';

// --- Interfaces (sin cambios) ---
interface Sensor {
  id: number;
  nombre: string;
  estado: 'Activo' | 'Inactivo' | 'Mantenimiento';
  tipoSensor: { id: number, nombre: string };
  surco?: { id: number, nombre: string };
  // --- ✅ 1. AÑADIR LÍMITES Y FECHA ---
  valor_minimo_alerta: number | string;
  valor_maximo_alerta: number | string;
  fecha_instalacion: string; // <-- Propiedad añadida
}
interface InformacionSensor {
  id: number;
  fechaRegistro: string;
  valor: number | string;
  sensor: { id: number; nombre: string; };
}
interface Lote { id: number; nombre: string; }
interface Surco { id: number; nombre: string; loteId: number; }
interface TipoSensor { id: number; nombre: string; }

// --- 2. Tipo de dato para el gráfico ---
type ChartData = {
  time: string;
  valor: number;
};

// --- 3. Componente de Tarjeta (Cuadrado) ---
interface SensorCardProps {
  sensor: Sensor;
  latestReading: InformacionSensor | undefined;
  onEdit: (sensor: Sensor) => void;
  onDelete: (id: number) => void;
}

function SensorCard({ sensor, latestReading, onEdit, onDelete }: SensorCardProps) {
  const getSensorIcon = (tipo: string) => {
    if (tipo.toLowerCase().includes('temperatura')) return <Thermometer className="w-8 h-8 text-orange-500" />;
    if (tipo.toLowerCase().includes('humedad')) return <Droplet className="w-8 h-8 text-blue-500" />;
    return <Bell className="w-8 h-8 text-gray-500" />;
  };

  const getUnit = (tipo: string) => {
    if (tipo.toLowerCase().includes('temperatura')) return '°C';
    if (tipo.toLowerCase().includes('humedad')) return '%';
    return '';
  };

  const unit = getUnit(sensor.tipoSensor.nombre);
  const valor = latestReading ? parseFloat(String(latestReading.valor)) : null;

  // --- ✅ 2. LÓGICA DE ALERTA ---
  const min = parseFloat(String(sensor.valor_minimo_alerta));
  const max = parseFloat(String(sensor.valor_maximo_alerta));

  let valorColor = "text-gray-900"; // Color normal
  let alertMessage: string | null = null;
  let cardBorderColor = "border-transparent"; // Borde normal

  if (valor !== null && !isNaN(min) && !isNaN(max)) {
    if (valor < min) {
      valorColor = "text-yellow-600 animate-pulse";
      alertMessage = `¡Valor Bajo! (Mín: ${min.toFixed(1)}${unit})`;
      cardBorderColor = "border-yellow-500";
    } else if (valor > max) {
      valorColor = "text-red-600 animate-pulse";
      alertMessage = `¡Valor Alto! (Máx: ${max.toFixed(1)}${unit})`;
      cardBorderColor = "border-red-500";
    }
  }
  // --- FIN LÓGICA DE ALERTA ---

  return (
    // --- ✅ 3. APLICAR BORDE DE ALERTA ---
    <div className={`bg-white shadow-xl rounded-xl p-6 relative transition-all border-4 ${cardBorderColor}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gray-100 rounded-full">
            {getSensorIcon(sensor.tipoSensor.nombre)}
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-800">{sensor.nombre}</h3>
            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${sensor.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {sensor.estado}
            </span>
          </div>
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => onEdit(sensor)} className="text-blue-500 hover:text-blue-700"><Edit size={16} /></button>
          <button onClick={() => onDelete(sensor.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="my-6 text-center">
        {valor !== null ? (
          // --- ✅ 4. APLICAR COLOR DE VALOR ---
          <p className={`text-6xl font-bold transition-colors ${valorColor}`}>
            {valor.toFixed(1)}
            <span className="text-4xl text-gray-500 ml-1">{unit}</span>
          </p>
        ) : (
          <p className="text-4xl font-bold text-gray-400">N/A</p>
        )}

        {/* --- ✅ 5. MOSTRAR MENSAJE DE ALERTA --- */}
        {alertMessage && (
          <div className={`mt-2 flex items-center justify-center gap-2 font-semibold ${valorColor}`}>
            <AlertTriangle size={16} /> <span>{alertMessage}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center text-sm text-gray-500 border-t pt-3 mt-4">
        <Clock size={14} className="mr-2" />
        {/* --- ✅ CORRECCIÓN DE ZONA HORARIA (TARJETA) --- */}
        Última lectura:{' '}
        {latestReading ? (() => {
          const utcDate = new Date(latestReading.fechaRegistro);
          const bogotaTime = new Date(utcDate.getTime() - 5 * 60 * 60 * 1000); // UTC-5
          return bogotaTime.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        })() : 'Nunca'}
      </div>

    </div>
  );
}

// --- 4. Componente de Gráfico ---
interface SensorHistoryChartProps {
  title: string;
  data: ChartData[];
  color: string;
  unit: string;
}

function SensorHistoryChart({ title, data, color, unit }: SensorHistoryChartProps) {
  return (
    <div className="bg-white shadow-xl rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

            <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} interval="preserveStartEnd" />

            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}${unit}`} />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)} ${unit}`, "Valor"]}
              labelFormatter={(label) => `Hora: ${label}`}
            />
            <Legend />
            <Line type="monotone" dataKey="valor" stroke={color} strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- 5. Componente Principal (Modificado) ---
export default function GestionSensoresPage(): ReactElement {
  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [informacionSensores, setInformacionSensores] = useState<InformacionSensor[]>([]);
  const [, setLotes] = useState<Lote[]>([]);
  const [surcos, setSurcos] = useState<Surco[]>([]);
  const [tiposSensor, setTiposSensor] = useState<TipoSensor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);

  const fetchData = async () => {
    try {
      const [sensoresRes, lotesRes, tiposRes, infoRes] = await Promise.all([
        listarSensores(),
        obtenerLotes(),
        listarTiposSensor(),
        listarInformacionSensores()
      ]);

      setSensores(sensoresRes.data || []);
      setInformacionSensores(infoRes || []);
      setLotes(lotesRes.data || []);
      setTiposSensor(tiposRes.data || []);

      const allSurcosPromises = (lotesRes.data || []).map((lote: Lote) => obtenerSurcosPorLote(lote.id));
      const allSurcosResponses = await Promise.all(allSurcosPromises);
      const allSurcos = allSurcosResponses.flatMap(res => res?.data || []);
      setSurcos(allSurcos);

    } catch (error) {
      toast.error("Error al cargar los datos de los sensores.");
      console.error("[Debug Inicial] Error en fetchData:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- ✅ MODIFICACIÓN ---
  // Pausar el refresco de datos (setInterval) cuando el modal está abierto
  // para no interrumpir al usuario mientras registra un sensor.
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchSensorData = async () => {
      try {
        console.log("Refrescando datos de sensores...");
        const infoRes = await listarInformacionSensores();
        setInformacionSensores(infoRes || []);
      } catch (error) {
        console.error("Error al refrescar los datos del sensor:", error);
      }
    };

    // Solo activar el intervalo si el modal NO está abierto
    if (!isModalOpen) {
      intervalId = setInterval(fetchSensorData, 5000);
    }

    // La función de limpieza se ejecuta cada vez que 'isModalOpen' cambia
    // o cuando el componente se desmonta.
    return () => {
      if (intervalId) {
        console.log("Pausando refresco de datos.");
        clearInterval(intervalId);
      }
    };
  }, [isModalOpen]); // <-- Se re-ejecuta cuando el modal se abre/cierra

  // --- 6. Procesar datos para tarjetas y gráficos ---
  const processedSensorData = useMemo(() => {
    // --- ✅ CORRECCIÓN 1: Eliminar el filtro de ID 1 y 2 ---
    // Esto permite que los sensores nuevos (ID 3, 4, etc.) aparezcan.
    const targetSensores = sensores;

    return targetSensores.map(sensor => {
      // Filtramos todas las lecturas para este sensor
      const allReadings = informacionSensores.filter(info => info.sensor.id === sensor.id);

      // --- ✅ CORRECCIÓN 2: Asegurar el ordenamiento ---
      // Ordenamos manualmente los datos (más nuevo primero)
      const sortedReadings = allReadings.sort((a, b) => {
        return new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime();
      });

      // La data ya viene ordenada (la más nueva primero)
      const latestReading = sortedReadings[0];

      // Preparamos datos para el gráfico (invertidos y formateados)
      // --- ✅ CORRECCIÓN 3: Tu solicitud (limitar a 10) ---
      const history = sortedReadings
        .slice(0, 10) // <-- Cambiado de 20 a 10
        .reverse()
        .map(reading => {
          const utcDate = new Date(reading.fechaRegistro);
          // Convertimos la hora UTC a Bogotá (-5 horas)
          const bogotaTime = new Date(utcDate.getTime() - 5 * 60 * 60 * 1000);

          return {
            time: bogotaTime.toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }),
            valor: parseFloat(String(reading.valor)),
          };
        });
      return {
        sensor,
        latestReading,
        history
      };
    });
  }, [sensores, informacionSensores]);


  // --- Lógica de Modales y CRUD (sin cambios) ---
  const handleSave = async (data: any) => {
    const toastId = toast.loading("Guardando sensor...");
    try {
      if (editingSensor) {
        await actualizarSensor(editingSensor.id, data);
        toast.success("Sensor actualizado con éxito.", { id: toastId });
      } else {
        await crearSensor(data);
        toast.success("Sensor creado con éxito.", { id: toastId });
      }
      await fetchData();
      closeModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al guardar el sensor.", { id: toastId });
    }
  };

  const handleDelete = (id: number) => {
    toast.warning('¿Estás seguro de que quieres eliminar este sensor?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const toastId = toast.loading("Eliminando sensor...");
          try {
            await eliminarSensor(id);
            toast.success("Sensor eliminado con éxito.", { id: toastId });
            await fetchData();
          } catch (error) {
            toast.error("No se pudo eliminar el sensor.", { id: toastId });
          }
        }
      },
      cancel: { label: 'Cancelar', onClick: () => { } },
    });
  };

  const openModal = (sensor: Sensor | null = null) => {
    setEditingSensor(sensor);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSensor(null);
  };

  // --- 7. Nuevo Renderizado (JSX) ---
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Monitor de Sensores</h1>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow">
          <Plus /> Agregar Sensor
        </button>
      </div>

      {/* Sección de Tarjetas (Cuadrados) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {processedSensorData.map(data => (
          <SensorCard
            key={data.sensor.id}
            sensor={data.sensor}
            latestReading={data.latestReading}
            onEdit={openModal}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Sección de Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {processedSensorData.map(data => {
          const isTemp = data.sensor.tipoSensor.nombre.toLowerCase().includes('temperatura');
          return (
            <SensorHistoryChart
              key={data.sensor.id}
              title={`Historial de ${data.sensor.tipoSensor.nombre}`}
              data={data.history}
              color={isTemp ? "#f97316" : "#3b82f6"} // Naranja para temp, Azul para humedad
              unit={isTemp ? "°C" : "%"}
            />
          );
        })}
      </div>

      {/* Modal para agregar/editar (sin cambios) */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingSensor ? 'Editar Sensor' : 'Agregar Nuevo Sensor'}>
        <SensorForm
          // --- ✅ 2. CORRECCIÓN DE INITIALDATA ---
          // Pasamos solo los valores planos que el formulario necesita,
          // evitando pasar los objetos 'surco' y 'tipoSensor'.
          initialData={editingSensor ? {
            nombre: editingSensor.nombre,
            estado: editingSensor.estado,
            fecha_instalacion: editingSensor.fecha_instalacion,
            valor_minimo_alerta: editingSensor.valor_minimo_alerta,
            valor_maximo_alerta: editingSensor.valor_maximo_alerta,
            surcoId: editingSensor.surco?.id,
            tipoSensorId: editingSensor.tipoSensor?.id,
          } : {}}
          surcos={surcos}
          tiposSensor={tiposSensor}
          onSave={handleSave}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}
