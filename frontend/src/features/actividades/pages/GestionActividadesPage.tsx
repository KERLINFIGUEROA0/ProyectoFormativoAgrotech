// src/features/actividades/pages/GestionActividadesPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, ClipboardList, Loader2, CheckCircle, Edit, Calendar, User } from 'lucide-react';

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
import { getEstadoBadgeClass, getEstadoTexto } from '../utils/estadoUtils';


// ------------------------------------------------------------
// NUEVO: Componente para mostrar Detalles de la Actividad (simulando la imagen)
// ------------------------------------------------------------
interface ModalDetallesProps {
    actividad: Actividad | null;
    onClose: () => void;
    onEdit: (actividad: Actividad) => void;
}

const ModalDetalles: React.FC<ModalDetallesProps> = ({ actividad, onClose, onEdit }) => {
    if (!actividad) return null;

    const estadoClase = getEstadoBadgeClass(actividad.estado).replace('bg-', 'bg-');
    const estadoTexto = getEstadoTexto(actividad.estado);
    const fechaProgramada = new Date(actividad.fecha).toLocaleDateString();
    const nombreCompleto = `${actividad.usuario?.nombre || 'N/A'} ${actividad.usuario?.apellidos || ''}`;

    return (
        <Modal isOpen={!!actividad} onClose={onClose} title="Detalles de Actividad" size="large">
            <div className="space-y-6">
                
                {/* Encabezado y Estado */}
                <div className={`p-4 rounded-t-lg flex justify-between items-center text-white font-bold ${actividad.estado === 'completado' ? 'bg-green-600' : 'bg-blue-600'}`}>
                    <h2 className="text-xl">Detalles de Actividad</h2>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full bg-white text-gray-800`}>
                        {estadoTexto}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                    {/* Columna 1: Información Básica */}
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2">Información Básica</h3>
                        <p className="text-sm"><strong>Nombre:</strong> {actividad.titulo}</p>
                        <p className="text-sm"><strong>Cultivo/Lote:</strong> {actividad.cultivo?.nombre || 'No especificado'}</p>
                    </div>

                    {/* Columna 2: Programación y Responsable */}
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2">Programación y Responsable</h3>
                        <p className="text-sm flex items-center gap-2"><Calendar size={14} className="text-blue-500" /> <strong>Fecha Programada:</strong> {fechaProgramada}</p>
                        {/* No tenemos Fecha Realizada en la interfaz, lo omitimos si no existe */}
                        <p className="text-sm flex items-center gap-2"><User size={14} className="text-blue-500" /> <strong>Aprendiz Asignado:</strong> {nombreCompleto}</p>
                    </div>
                </div>

                {/* Descripción Completa */}
                <div className="p-4 border-t pt-4">
                    <h3 className="font-bold text-gray-700 mb-2">Descripción Completa</h3>
                    <p className="text-gray-600 text-sm">{actividad.descripcion || 'No hay descripción detallada.'}</p>
                </div>
                
                {/* Botón de Editar */}
                <div className="flex justify-end p-4 border-t">
                    <button 
                        onClick={() => onEdit(actividad)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        <Edit size={16} /> Editar
                    </button>
                </div>

            </div>
        </Modal>
    );
};
// ------------------------------------------------------------
// FIN: Componente de Detalles de Actividad
// ------------------------------------------------------------


// Componente para las tarjetas de estadísticas (Mantenemos como estaba)
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Modal para Editar/Crear
  const [actividadAEditar, setActividadAEditar] = useState<Partial<Actividad> | null>(null);
  
  // ✅ Nuevo estado para ver detalles
  const [actividadAVer, setActividadAVer] = useState<Actividad | null>(null); 

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

  // Lógica para abrir/cerrar modal de EDICIÓN/CREACIÓN
  const handleOpenEditModal = (actividad?: Actividad) => {
    setActividadAVer(null); // Asegura que se cierra el modal de detalles
    setActividadAEditar(actividad || {});
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setActividadAEditar(null);
  };
  
  // ✅ Lógica para abrir/cerrar modal de DETALLES
  const handleViewDetails = (actividad: Actividad) => {
      setActividadAVer(actividad);
  };
  const handleCloseDetailsModal = () => {
      setActividadAVer(null);
  };
  
  // Lógica para guardar (Crear o Actualizar)
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
      handleCloseEditModal();
      await cargarDatos();
    } catch (err) {
      toast.error('Error al guardar.', { id: toastId });
    }
  };
  
  // Lógica para eliminar (con confirmación de sonner)
  const handleDelete = async (id: number) => {
    toast.error('¿Seguro que deseas eliminar esta actividad?', {
      description: 'Esta acción no se puede deshacer.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const toastId = toast.loading('Eliminando...');
          try {
            await eliminarActividad(id);
            toast.success('Actividad eliminada', { id: toastId });
            await cargarDatos(); 
          } catch (err) {
            toast.error('Error al eliminar.', { id: toastId });
          }
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}, 
      },
      duration: 10000 // Aumentamos la duración para dar tiempo a la confirmación
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
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow" onClick={() => handleOpenEditModal()}>
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
                onEdit={handleOpenEditModal} // Llama a la modal de edición
                onDelete={handleDelete} // Llama a la función de eliminación
                onView={handleViewDetails} // ✅ Llama a la función de ver detalles
              />
            ))
          )}
        </div>
      </div>

      {/* Modal de CREACIÓN / EDICIÓN */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={handleCloseEditModal} 
        title={actividadAEditar?.id ? 'Editar Actividad' : 'Nueva Actividad'}
      >
          <FormularioActividad
            actividadInicial={actividadAEditar || {}}
            usuarios={usuarios}
            cultivos={cultivos}
            onSubmit={handleSave}
            onCancel={handleCloseEditModal}
          />
      </Modal>
      
      {/* ✅ Modal de DETALLES DE ACTIVIDAD */}
      <ModalDetalles
        actividad={actividadAVer}
        onClose={handleCloseDetailsModal}
        // Permite abrir el modal de edición directamente desde el modal de detalles
        onEdit={(act: Actividad) => {
            handleCloseDetailsModal(); // Cierra los detalles
            handleOpenEditModal(act); // Abre la edición con la actividad
        }}
      />
    </div>
  );
};

export default GestionActividadesPage;