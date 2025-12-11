// src/features/actividades/pages/PrincipalAcvidades.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { DateTime } from 'luxon';
import {
  ClipboardList, Users, ArrowRight, Loader2, Leaf, Shield
} from 'lucide-react';

import { listarActividades, obtenerUsuariosParaActividades, obtenerCultivosParaActividades } from '../api/actividadesapi';
import type { Actividad, UsuarioSimple, CultivoSimple } from '../interfaces/actividades';

import AsignacionActividadForm from '../components/AsignacionActividadForm';
import { Modal, ModalContent, ModalHeader, ModalBody, Card, CardBody } from '@heroui/react';

// --- Componente de Tarjeta de Acceso Rápido (sin cambios) ---
interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  action?: () => void;
  link?: string;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({ title, description, icon, action, link }) => (
  <div
    onClick={action ? action : (link ? () => window.location.href = link : undefined)}
    className={`bg-white p-6 rounded-xl shadow-md border border-green-200 hover:border-green-400 flex flex-col justify-between h-48 hover:shadow-lg transition-all duration-300 ${action || link ? 'cursor-pointer' : ''}`}
  >
    <div className="flex justify-between items-start">
      <div className="p-3 rounded-full bg-green-50 shadow-sm border border-green-100">
        {icon}
      </div>
      <ArrowRight className="text-green-300 w-5 h-5" />
    </div>
    <div className="mt-4">
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
      {link && (
        <a href={link} className="flex items-center text-sm font-bold text-green-600 hover:text-green-700 mt-2">
          Acceder <ArrowRight className="w-4 h-4 ml-1" />
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
    // Para actividades asignadas, mostrar "Completado" sin nombre específico
    const asignados = (() => {
      try {
        return actividad.asignados ? JSON.parse(actividad.asignados) : [];
      } catch {
        return [];
      }
    })();
    if (asignados.length > 0) {
      statusText = 'Completado';
    } else {
      statusText = `Completado por ${actividad.usuario?.nombre || 'N/A'}`;
    }
    statusColor = 'text-green-600';
  } else if (actividad.estado === 'pendiente') {
    statusText = 'Pendiente';
    statusColor = 'text-gray-500';
  } else if (actividad.estado === 'en proceso') {
    statusText = 'En Proceso';
    statusColor = 'text-yellow-600';
  } else {
    statusText = `Asignado a ${actividad.responsable?.nombre || actividad.usuario?.nombre || 'N/A'}`;
    statusColor = 'text-gray-600';
  }

  // CAMBIO: Mostrar fecha límite en lugar de tiempo transcurrido
  const fechaLimite = DateTime.fromISO(actividad.fecha).setZone('utc').toFormat('dd/MM/yyyy');

  return (
    <div className="flex justify-between items-start py-4 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200 mb-2 last:mb-0">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-white rounded-full shadow-sm">
          {icon}
        </div>
        <div>
          <p className="font-medium text-gray-800">{actividad.titulo}</p>
          <p className={`text-sm ${statusColor}`}>{statusText}</p>
        </div>
      </div>
      <p className="text-sm text-gray-500 whitespace-nowrap font-medium">
        {fechaLimite}
      </p>
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
        .slice(0, 5);
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
    <div className="p-6 bg-gray-50 min-h-screen space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Gestión Actividades</h1>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QuickAccessCard
            title="Asignación de Actividades"
            description="Asigna tareas específicas a los aprendices"
            icon={<ClipboardList className="w-6 h-6 text-blue-600" />}
            colorClass="border-blue-500"
            action={() => setIsAsignacionModalOpen(true)}
          />
          <QuickAccessCard
            title="Gestión de Actividades"
            description="Consulta y administra todas las actividades"
            icon={<Users className="w-6 h-6 text-orange-600" />}
            colorClass="border-orange-500"
            link="/cronograma"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Actividades Recientes</h2>
          <a href="/cronograma" className="text-green-600 font-medium hover:text-green-700">
            Ver todas
          </a>
        </div>

        <Card className="shadow-lg">
          <CardBody className="p-6">
            {cargando && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                <p className="ml-2 text-gray-500">Cargando...</p>
              </div>
            )}
            {!cargando && actividadesRecientes.length === 0 && (
              <p className="text-center text-gray-500 py-8">No hay actividades recientes para mostrar.</p>
            )}
            {!cargando && actividadesRecientes.map((act) => (
              <RecentActivityItem key={act.id} actividad={act} />
            ))}
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={isAsignacionModalOpen}
        onOpenChange={() => setIsAsignacionModalOpen(false)}
        size="5xl"
        scrollBehavior="inside"
      >
        <ModalContent className="border-l-4 border-r-4 border-gray-200">
          <ModalHeader>Asignación de Actividades</ModalHeader>
          <ModalBody className="border-l border-r border-gray-100">
            <AsignacionActividadForm
              usuarios={usuarios}
              cultivos={cultivos}
              onCancel={() => setIsAsignacionModalOpen(false)}
              onSuccess={cargarActividades}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
};

// ✅ 4. Renombramos el export para que coincida con el nombre del archivo y las rutas
export default ActividadesPrincipal;
