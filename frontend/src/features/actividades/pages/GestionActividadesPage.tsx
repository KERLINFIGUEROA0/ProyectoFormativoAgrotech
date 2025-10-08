// src/features/actividades/pages/GestionActividadesPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, ClipboardList, Loader2, CheckCircle } from 'lucide-react';

import ActividadCard from '../components/ActividadCard';
import FormularioActividad from '../components/FormularioActividad';
import Modal from '../../../components/Modal';
import type { 
  Actividad, 
  CreateActividadPayload, 
  UpdateActividadPayload, 
  EstadoActividad,
  UsuarioSimple,
  CultivoSimple
} from '../interfaces/actividades';
import { 
  listarActividades, 
  registrarActividad, 
  actualizarActividad, 
  eliminarActividad,
  obtenerUsuariosParaActividades,
  obtenerCultivosParaActividades
} from '../api/actividadesapi';

// Componente para las tarjetas de estadísticas
const StatCard = ({ title, value, icon, colorClass }: any) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
    <div className={`p-3 rounded-full ${colorClass}`}>
      {icon}
    </div>
    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="font-bold text-2xl">{value}</p>
    </div>
  </div>
);


const GestionActividadesPage: React.FC = () => {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSimple[]>([]);
  const [cultivos, setCultivos] = useState<CultivoSimple[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<EstadoActividad | 'Todos'>('Todos');
  
  const [cargando, setCargando] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actividadAEditar, setActividadAEditar] = useState<Partial<Actividad> | null>(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [actividadesData, usuariosData, cultivosData] = await Promise.all([
        listarActividades(),
        obtenerUsuariosParaActividades(),
        obtenerCultivosParaActividades()
      ]);
      setActividades(actividadesData || []);
      setUsuarios(usuariosData || []);
      setCultivos(cultivosData || []);
    } catch (err) {
      toast.error('No se pudieron cargar los datos necesarios.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Lógica para abrir/cerrar modal, guardar y eliminar (sin cambios)
  const handleOpenModal = (actividad?: Actividad) => {
    setActividadAEditar(actividad || {});
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActividadAEditar(null);
  };
  const handleSave = async (payload: CreateActividadPayload | UpdateActividadPayload) => {
    const isEditing = actividadAEditar && actividadAEditar.id;
    const toastId = toast.loading(isEditing ? 'Actualizando...' : 'Creando...');
    try {
      if (isEditing) {
        await actualizarActividad(actividadAEditar.id!, payload as UpdateActividadPayload);
      } else {
        await registrarActividad(payload as CreateActividadPayload);
      }
      toast.success('Actividad guardada', { id: toastId });
      handleCloseModal();
      await cargarDatos();
    } catch (err) {
      toast.error('Error al guardar.', { id: toastId });
    }
  };
  const handleDelete = async (id: number) => {
    toast.error('¿Seguro que deseas eliminar esta actividad?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const toastId = toast.loading('Eliminando...');
          try {
            await eliminarActividad(id);
            toast.success('Actividad eliminada', { id: toastId });
            await cargarDatos(); // Recarga los datos después de eliminar
          } catch (err) {
            toast.error('Error al eliminar.', { id: toastId });
          }
        }
      },
      // Se añade la función onClick vacía para el botón de cancelar
      cancel: {
        label: 'Cancelar',
        onClick: () => {}, // Esto soluciona el error
      },
    });
  };
  // Memoizamos los cálculos para las estadísticas y la lista filtrada
  const stats = useMemo(() => {
    return {
      pendientes: actividades.filter(a => a.estado === 'pendiente').length,
      enProceso: actividades.filter(a => a.estado === 'en proceso').length,
      completadas: actividades.filter(a => a.estado === 'completado').length,
    };
  }, [actividades]);

  const filteredActividades = useMemo(() => {
    if (filtroEstado === 'Todos') return actividades;
    return actividades.filter(a => a.estado === filtroEstado);
  }, [actividades, filtroEstado]);

  if (cargando) return <div className="text-center mt-8">Cargando...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Actividades</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow" onClick={() => handleOpenModal()}>
          <Plus /> Nueva Actividad
        </button>
      </div>

      {/* Sección de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Pendientes" value={stats.pendientes} icon={<ClipboardList />} colorClass="bg-blue-100 text-blue-700" />
        <StatCard title="En Proceso" value={stats.enProceso} icon={<Loader2 className="animate-spin" />} colorClass="bg-yellow-100 text-yellow-700" />
        <StatCard title="Completadas" value={stats.completadas} icon={<CheckCircle />} colorClass="bg-green-100 text-green-700" />
      </div>

      {/* Contenedor de la lista de actividades */}
      <div className="bg-white shadow-xl rounded-xl p-6 w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-600">Lista de Actividades</h2>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as EstadoActividad | 'Todos')}
            className="border border-gray-300 rounded-lg p-2 bg-white shadow-sm text-sm"
          >
            <option value="Todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en proceso">En Proceso</option>
            <option value="completado">Completado</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredActividades.length === 0 ? (
            <p className="col-span-full text-center text-gray-500 py-8">No hay actividades con el filtro seleccionado.</p>
          ) : (
            filteredActividades.map((act) => (
              <ActividadCard
                key={act.id}
                actividad={act}
                onEdit={handleOpenModal}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={actividadAEditar?.id ? 'Editar Actividad' : 'Nueva Actividad'}>
          <FormularioActividad
            actividadInicial={actividadAEditar || {}}
            usuarios={usuarios}
            cultivos={cultivos}
            onSubmit={handleSave}
            onCancel={handleCloseModal}
          />
      </Modal>
    </div>
  );
};

export default GestionActividadesPage;