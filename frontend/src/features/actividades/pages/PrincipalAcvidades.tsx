// src/features/actividades/pages/PrincipalAcvidades.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList, Users, ArrowRight, Loader2, Leaf, Shield
} from 'lucide-react';

import { listarActividades, obtenerUsuariosParaActividades, obtenerCultivosParaActividades } from '../api/actividadesapi';
import type { Actividad, UsuarioSimple, CultivoSimple } from '../interfaces/actividades';

import Modal from '../../../components/Modal';
import AsignacionActividadForm from '../components/AsignacionActividadForm';

// --- Componente de Tarjeta de Acceso Rápido (sin cambios) ---
interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  action?: () => void;
  link?: string;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({ title, description, icon, colorClass, action, link }) => (
  <div
    onClick={action ? action : (link ? () => window.location.href = link : undefined)} 
    className={`bg-white p-4 md:p-6 rounded-xl shadow-md border-t-4 ${colorClass} flex flex-col justify-between h-40 md:h-48 hover:shadow-lg transition-all duration-300 ${action || link ? 'cursor-pointer' : ''}`}
  >
    <div className="flex justify-between items-start">
      <div className={`p-2 md:p-3 rounded-full ${colorClass.replace('border-t-4', '').replace('border-', 'bg-')} bg-opacity-10`}>
        {icon}
      </div>
      <ArrowRight className="text-gray-400 w-4 h-4 md:w-5 md:h-5" />
    </div>
    <div className="mt-3 md:mt-4">
      <h3 className="text-base md:text-lg font-semibold text-gray-800">{title}</h3>
      <p className="text-xs md:text-sm text-gray-500 mt-1">{description}</p>
      {link && (
        <a href={link} className="flex items-center text-xs md:text-sm font-medium text-green-600 hover:text-green-700 mt-2">
          Acceder <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1" />
        </a>
      )}
    </div>
  </div>
);

// --- Función de íconos y componente de item reciente (sin cambios) ---
const getActivityIcon = (actividad: Actividad) => {
  const titulo = actividad.titulo?.toLowerCase() ?? ''; 
  if (titulo.includes('riego') || titulo.includes('agua')) {
    return <Leaf className="w-5 h-5 text-blue-500" />;
  }
  if (titulo.includes('fertiliz')) {
    return <Leaf className="w-5 h-5 text-yellow-600" />;
  }
  if (titulo.includes('plagas') || titulo.includes('control')) {
    return <Shield className="w-5 h-5 text-red-500" />;
  }
  return <ClipboardList className="w-5 h-5 text-green-600" />;
};

const RecentActivityItem: React.FC<{ actividad: Actividad }> = ({ actividad }) => {
  const icon = getActivityIcon(actividad);

  let statusText: string;
  let statusColor: string;

  if (actividad.estado === 'completado') {
    statusText = `Completado por ${actividad.usuario?.nombre || 'N/A'}`;
    statusColor = 'text-green-600';
  } else if (actividad.estado === 'pendiente') {
    statusText = 'Pendiente';
    statusColor = 'text-gray-500';
  } else {
    statusText = `Asignado a ${actividad.usuario?.nombre || 'N/A'}`;
    statusColor = 'text-gray-600';
  }

  const getTimeElapsed = (date: string) => {
    const diff = new Date().getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) return 'Hace un momento';
    if (hours < 24) return `Hace ${hours}h`;
    return new Date(date).toLocaleDateString();
  };
  
  const timeInfo =
    actividad.estado === 'completado' || actividad.estado === 'en proceso'
      ? getTimeElapsed(actividad.fecha)
      : 'Mañana';

  return (
    <div className="flex justify-between items-start py-2 md:py-3 border-b last:border-b-0">
      <div className="flex items-start space-x-2 md:space-x-3 flex-1 min-w-0">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-800 text-sm md:text-base truncate">{actividad.titulo}</p>
          <p className={`text-xs md:text-sm ${statusColor} truncate`}>{statusText}</p>
        </div>
      </div>
      <p className="text-xs md:text-sm text-gray-500 whitespace-nowrap ml-2 flex-shrink-0">{timeInfo}</p>
    </div>
  );
};


// --- Componente Principal ---
const ActividadesPrincipal: React.FC = () => {
  const [actividadesRecientes, setActividadesRecientes] = useState<Actividad[]>([]);
  // ✅ 3. Se aplican los tipos correctos a los estados
  const [usuarios, setUsuarios] = useState<UsuarioSimple[]>([]);
  const [cultivos, setCultivos] = useState<CultivoSimple[]>([]);
  
  const [isAsignacionModalOpen, setIsAsignacionModalOpen] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargarActividades = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarActividades();
      const sorted = (data || [])
        .sort((a: Actividad, b: Actividad) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 3);
      setActividadesRecientes(sorted);
    } catch (err) {
      toast.error('No se pudieron cargar las actividades recientes.');
      setActividadesRecientes([]);
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarDatosSecundarios = useCallback(async () => {
    try {
      const [usuariosData, cultivosData] = await Promise.all([
        obtenerUsuariosParaActividades(),
        obtenerCultivosParaActividades(),
      ]);
      setUsuarios(usuariosData || []);
      setCultivos(cultivosData || []);
    } catch {
      toast.error('Error al cargar usuarios o cultivos.');
    }
  }, []);

  useEffect(() => {
    cargarActividades();
    cargarDatosSecundarios();
  }, [cargarActividades, cargarDatosSecundarios]);

  return (
    <div className="p-3 md:p-6 bg-gray-50 min-h-screen space-y-4 md:space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 bg-green-600 text-white rounded-lg shadow-lg">
        <div className="w-full md:w-auto">
          <h1 className="text-xl md:text-2xl font-bold mb-1">¡Bienvenido!</h1>
          <p className="text-sm md:text-lg">Administra eficientemente todas las actividades agrícolas</p>
        </div>
        {/* Este ícono debe estar en tu carpeta public/ para que funcione */}
        <img src="/tractor-icon.svg" alt="Tractor" className="w-12 h-12 md:w-18 md:h-18 text-white mt-3 md:mt-0 self-center md:self-auto" />
      </div>

      <div className="space-y-3 md:space-y-4">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
          <QuickAccessCard
            title="Asignación de Actividades"
            description="Asigna tareas específicas a los aprendices"
            icon={<ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />}
            colorClass="border-blue-500"
            action={() => setIsAsignacionModalOpen(true)}
          />
          <QuickAccessCard
            title="Gestión de Actividades"
            description="Consulta y administra todas las actividades"
            icon={<Users className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />}
            colorClass="border-orange-500"
            link="/cronograma"
          />
        </div>
      </div>

      <div className="space-y-3 md:space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">Actividades Recientes</h2>
          <a href="/cronograma" className="text-green-600 font-medium hover:text-green-700 text-sm md:text-base self-start sm:self-auto">
            Ver todas
          </a>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md">
          {cargando && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-green-600" />
              <p className="ml-2 text-gray-500 text-sm md:text-base">Cargando...</p>
            </div>
          )}
          {!cargando && actividadesRecientes.length === 0 && (
            <p className="text-center text-gray-500 py-8 text-sm md:text-base">No hay actividades recientes para mostrar.</p>
          )}
          {!cargando && actividadesRecientes.map((act) => (
            <RecentActivityItem key={act.id} actividad={act} />
          ))}
        </div>
      </div>

      <Modal
        isOpen={isAsignacionModalOpen}
        onClose={() => setIsAsignacionModalOpen(false)}
        title="Asignación de Actividades"
      >
        <AsignacionActividadForm
          usuarios={usuarios}
          cultivos={cultivos}
          onCancel={() => setIsAsignacionModalOpen(false)}
          onSuccess={cargarActividades}
        />
      </Modal>
    </div>
  );
};

// ✅ 4. Renombramos el export para que coincida con el nombre del archivo y las rutas
export default ActividadesPrincipal;