// --- MODIFICACIÓN: Añadir 'useMemo', 'Package' y 'Users' ---
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
// --- MODIFICACIÓN: Añadidos Package y Users ---
import {
  ClipboardList,
  Loader2,
  CheckCircle,
  Edit,
  Calendar,
  User,
  FileText,
  Bell,
  Package,
  Users,
} from 'lucide-react';

import ActividadCard from '../components/ActividadCard';
import FormularioActividad from '../components/FormularioActividad';
import Modal from '../../../components/Modal';
import { useAuth } from '../../../context/AuthContext';
import type {
  Actividad,
  UpdateActividadPayload,
  EstadoActividad,
  UsuarioSimple,
  CultivoSimple,
} from '../interfaces/actividades';
import {
  listarActividades,
  registrarActividad,
  actualizarActividad,
  eliminarActividad,
  obtenerUsuariosParaActividades,
  obtenerCultivosParaActividades,
} from '../api/actividadesapi';
import { getEstadoTexto } from '../utils/estadoUtils';

// --- INICIO: Componente ModalDetalles (MODIFICADO) ---
interface ModalDetallesProps {
  // --- MODIFICACIÓN: Asegurar que el tipo Actividad incluya los materiales ---
  actividad: (Actividad & {
    actividadMaterial?: {
      cantidadUsada: number;
      material: { id: number; nombre: string };
    }[];
  }) | null;
  onClose: () => void;
  onEdit: (actividad: Actividad) => void;
  // --- MODIFICACIÓN: Añadir la lista completa de actividades ---
  allActividades: Actividad[];
}

const ModalDetalles: React.FC<ModalDetallesProps> = ({
  actividad,
  onClose,
  onEdit,
  // --- MODIFICACIÓN: Recibir la lista completa ---
  allActividades,
}) => {
  if (!actividad) return null;

  // --- MODIFICACIÓN: Lógica para agrupar aprendices ---
  // Se buscan todas las actividades que coincidan en título, fecha y cultivo.
  const aprendicesAsignados = useMemo(() => {
    if (!actividad) return [];
    return allActividades
      .filter(
        (a) =>
          a.titulo === actividad.titulo &&
          a.fecha === actividad.fecha &&
          a.cultivo?.id === actividad.cultivo?.id &&
          a.usuario, // Asegurarse de que tenga un usuario
      )
      .map((a) => a.usuario!); // Obtenemos el objeto usuario
  }, [actividad, allActividades]);
  // --- FIN DE LÓGICA DE AGRUPACIÓN ---

  // Lógica para parsear imágenes (la tenías en tus logs)
  let imagenes: string[] = [];
  if (actividad.img) {
    try {
      const parsedImgs = JSON.parse(actividad.img);
      if (Array.isArray(parsedImgs)) {
        imagenes = parsedImgs;
      } else if (typeof parsedImgs === 'string') {
        imagenes = [parsedImgs];
      }
    } catch (e) {
      // Si no es JSON, es un string único
      if (typeof actividad.img === 'string') {
        imagenes = [actividad.img];
      }
    }
  }

  const estadoTexto = getEstadoTexto(actividad.estado);
  const fechaProgramada = new Date(actividad.fecha).toLocaleDateString('es-ES', {
    timeZone: 'UTC', // Asegurar que la fecha sea la correcta
  });

  return (
    // Quitamos 'title' del Modal, ya que el diseño lo tiene dentro
    <Modal isOpen={!!actividad} onClose={onClose} title="">
      <div className="space-y-6">
        {/* Cabecera del Modal */}
        <div
          className={`p-4 rounded-t-lg flex justify-between items-center text-white font-bold ${
            actividad.estado === 'completado' ? 'bg-green-600' : 'bg-blue-600'
          }`}
        >
          <h2 className="text-xl">{actividad.titulo}</h2>
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full bg-white text-gray-800`}
          >
            {estadoTexto}
          </span>
        </div>

        {/* --- MODIFICACIÓN: Reestructurado para 2 columnas y añadir materiales --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
          {/* Columna Izquierda: Detalles */}
          <div className="space-y-4">
            {/* Info Básica */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
              <h3 className="font-bold text-gray-700">Información Básica</h3>
              <p className="text-sm flex items-center gap-2">
                <ClipboardList size={14} className="text-blue-500" />
                <strong>Actividad:</strong> {actividad.titulo}
              </p>
              <p className="text-sm flex items-center gap-2">
                <User size={14} className="text-blue-500" />
                <strong>Cultivo/Lote:</strong>{' '}
                {actividad.cultivo?.nombre || 'No especificado'}
              </p>
              <p className="text-sm flex items-center gap-2">
                <Calendar size={14} className="text-blue-500" />
                <strong>Fecha Programada:</strong> {fechaProgramada}
              </p>
            </div>

            {/* Aprendices Asignados (Lógica corregida) */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Users size={16} /> Aprendices Asignados
              </h3>
              {aprendicesAsignados.length > 0 ? (
                <ul className="list-disc list-inside pl-2 space-y-1">
                  {aprendicesAsignados.map((user) => (
                    <li key={user.identificacion} className="text-sm text-gray-700">
                      {user.nombre} {user.apellidos}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No asignado</p>
              )}
            </div>

            {/* Materiales Utilizados (NUEVO) */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Package size={16} /> Materiales Utilizados
              </h3>
              {actividad.actividadMaterial &&
              actividad.actividadMaterial.length > 0 ? (
                <ul className="list-disc list-inside pl-2 space-y-1">
                  {actividad.actividadMaterial.map((item, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      {item.material.nombre}:{' '}
                      <span className="font-medium">
                        {item.cantidadUsada}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">
                  No se registraron materiales.
                </p>
              )}
            </div>
          </div>

          {/* Columna Derecha: Descripción e Imágenes */}
          <div className="space-y-4">
            {/* Descripción */}
            <div className="p-3">
              <h3 className="font-bold text-gray-700 mb-2">
                Descripción Completa
              </h3>
              <p className="text-gray-600 text-sm">
                {actividad.descripcion || 'No hay descripción detallada.'}
              </p>
            </div>

            {/* Sección de Imágenes */}
            {imagenes.length > 0 && (
              <div className="p-3">
                <h3 className="font-bold text-gray-700 mb-2">
                  Imágenes de la Actividad
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {imagenes.map((img: string, index: number) => (
                    <div key={index} className="relative">
                      <img
                        src={`${import.meta.env.VITE_BACKEND_URL}/uploads/actividades/${img}`}
                        alt={`Imagen ${index + 1} de ${actividad.titulo}`}
                        className="w-full h-32 object-cover rounded-lg border"
                        onError={(e) => {
                          e.currentTarget.src =
                            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4=';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* --- FIN DE MODIFICACIÓN --- */}

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

// (Componente StatCard sin cambios)
const StatCard = ({ title, value, icon, colorClass }: any) => (
  // ... (código sin cambios)
  <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
    <div className={`p-3 rounded-full ${colorClass}`}>{icon}</div>
    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="font-bold text-2xl">{value}</p>
    </div>
  </div>
);

const GestionActividadesPage: React.FC = () => {
  const { userData } = useAuth();
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [, setUsuarios] = useState<UsuarioSimple[]>([]); // (Se mantiene, aunque no se use en filtros)
  const [cultivos, setCultivos] = useState<CultivoSimple[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<EstadoActividad | 'Todos'>(
    'Todos',
  );

  const [cargando, setCargando] = useState<boolean>(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actividadAEditar, setActividadAEditar] =
    useState<Partial<Actividad> | null>(null);

  const [actividadAVer, setActividadAVer] = useState<Actividad | null>(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [actividadesData, usuariosData, cultivosData] = await Promise.all([
        listarActividades(),
        obtenerUsuariosParaActividades(),
        obtenerCultivosParaActividades(),
      ]);
      
      // --- MODIFICACIÓN: Limpiar los logs de diagnóstico ---
      // console.log("🔍 Diagnóstico de actividades cargadas:", ...);
      
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

  // (Función mostrarNotificacionesPendientes sin cambios)
  const mostrarNotificacionesPendientes = useCallback(() => {
    // ... (código sin cambios)
    if (!userData || !actividades.length) return;
    const actividadesPendientesUsuario = actividades.filter(act =>
      act.estado === 'pendiente' &&
      act.usuario?.identificacion === userData.identificacion
    );
    if (actividadesPendientesUsuario.length > 0) {
      toast.warning(
        `Tienes ${actividadesPendientesUsuario.length} actividad(es) pendiente(s) por completar.`,
        // ... (resto de la notificación)
      );
    }
  }, [actividades, userData]);

  useEffect(() => {
    if (!cargando && actividades.length > 0) {
      mostrarNotificacionesPendientes();
    }
  }, [cargando, actividades, mostrarNotificacionesPendientes]);

  // (Lógica para abrir/cerrar modales sin cambios)
  const handleOpenEditModal = (actividad?: Actividad) => {
    setActividadAVer(null);
    setActividadAEditar(actividad || {});
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setActividadAEditar(null);
  };
  const handleViewDetails = (actividad: Actividad) => {
    setActividadAVer(actividad);
  };
  const handleCloseDetailsModal = () => {
    setActividadAVer(null);
  };

  // (Lógica de handleSave sin cambios)
  const handleSave = async (payload: FormData | UpdateActividadPayload) => {
    const isEditing = actividadAEditar && actividadAEditar.id;
    const toastId = toast.loading(isEditing ? 'Actualizando...' : 'Creando...');
    try {
      if (isEditing) {
        await actualizarActividad(
          actividadAEditar.id!,
          payload as UpdateActividadPayload,
        );
      } else {
        await registrarActividad(payload as FormData);
      }
      toast.success('Actividad guardada', { id: toastId });
      handleCloseEditModal();
      await cargarDatos();
    } catch (err: any) { // --- MODIFICACIÓN: Capturar error del backend ---
      const errorMsg = err.response?.data?.message || 'Error al guardar la actividad.';
      toast.error(errorMsg, { id: toastId });
      // --- FIN MODIFICACIÓN ---
    }
  };

  // (Lógica de handleDelete sin cambios)
  const handleDelete = async (id: number) => {
    // ... (código sin cambios)
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
      duration: 10000
    });
  };

  // (useMemo para stats y filteredActividades sin cambios)
  const stats = useMemo(() => {
    return {
      pendientes: actividades.filter((a) => a.estado === 'pendiente').length,
      enProceso: actividades.filter((a) => a.estado === 'en proceso').length,
      completadas: actividades.filter((a) => a.estado === 'completado').length,
    };
  }, [actividades]);

  const filteredActividades = useMemo(() => {
    if (filtroEstado === 'Todos') return actividades;
    return actividades.filter((a) => a.estado === filtroEstado);
  }, [actividades, filtroEstado]);

  // (Función exportarPDF sin cambios)
  // Función para exportar PDF
  const exportarPDF = useCallback(async () => {
    try {
      // --- INICIO DE LA CORRECCIÓN ---
      // jsPDF es un export por defecto, por eso se importa con "default"
      const { default: jsPDF } = await import('jspdf');
      // --- FIN DE LA CORRECCIÓN ---

      const doc = new jsPDF();

      // Título
      doc.setFontSize(20);
      doc.text('Reporte de Actividades', 20, 20);

      // Fecha de generación
      doc.setFontSize(12);
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 20, 35);

      // Estadísticas
      doc.text(`Total de actividades: ${actividades.length}`, 20, 50);
      doc.text(`Pendientes: ${stats.pendientes}`, 20, 60);
      doc.text(`En proceso: ${stats.enProceso}`, 20, 70);
      doc.text(`Completadas: ${stats.completadas}`, 20, 80);

      // Tabla de actividades
      const tableData = filteredActividades.map(act => [
        act.titulo,
        act.cultivo?.nombre || 'No especificado',
        `${act.usuario?.nombre || 'N/A'} ${act.usuario?.apellidos || ''}`,
        new Date(act.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' }), // Añadir UTC para consistencia
        getEstadoTexto(act.estado),
        act.descripcion || 'Sin descripción'
      ]);

      // Importar autoTable dinámicamente (Esta línea estaba correcta)
      const { default: autoTable } = await import('jspdf-autotable');
      
      autoTable(doc, {
        head: [['Título', 'Cultivo/Lote', 'Aprendiz', 'Fecha', 'Estado', 'Descripción']],
        body: tableData,
        startY: 90,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      // Guardar el PDF
      doc.save(`reporte-actividades-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generado correctamente');

    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar el PDF');
    }
  }, [actividades, filteredActividades, stats]);

  if (cargando)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-green-600" size={48} />
      </div>
    );

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-6">
      {/* (Cabecera y botones sin cambios) */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">
          Gestión de Actividades
        </h1>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 shadow"
            onClick={mostrarNotificacionesPendientes}
            title="Mostrar notificaciones de actividades pendientes"
          >
            <Bell size={16} /> Notificaciones
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow"
            onClick={exportarPDF}
          >
            <FileText size={16} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* (Sección de Estadísticas sin cambios) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Pendientes"
          value={stats.pendientes}
          icon={<ClipboardList />}
          colorClass="bg-blue-100 text-blue-700"
        />
        <StatCard
          title="En Proceso"
          value={stats.enProceso}
          icon={<Loader2 className="animate-spin" />}
          colorClass="bg-yellow-100 text-yellow-700"
        />
        <StatCard
          title="Completadas"
          value={stats.completadas}
          icon={<CheckCircle />}
          colorClass="bg-green-100 text-green-700"
        />
      </div>

      {/* (Contenedor de la lista de actividades sin cambios) */}
      <div className="bg-white shadow-xl rounded-xl p-6 w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-600">
            Lista de Actividades
          </h2>
          <select
            value={filtroEstado}
            onChange={(e) =>
              setFiltroEstado(e.target.value as EstadoActividad | 'Todos')
            }
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
            <p className="col-span-full text-center text-gray-500 py-8">
              No hay actividades con el filtro seleccionado.
            </p>
          ) : (
            filteredActividades.map((act) => (
              <ActividadCard
                key={act.id}
                actividad={act}
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
                onView={handleViewDetails}
              />
            ))
          )}
        </div>
      </div>

      {/* (Modal de CREACIÓN / EDICIÓN sin cambios) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title={actividadAEditar?.id ? 'Editar Actividad' : 'Nueva Actividad'}
      >
        <FormularioActividad
          actividadInicial={actividadAEditar || {}}
          cultivos={cultivos}
          onSubmit={handleSave}
          onCancel={handleCloseEditModal}
        />
      </Modal>

      {/* Modal de DETALLES DE ACTIVIDAD (MODIFICADO) */}
      {/* Se pasa 'allActividades' para agrupar aprendices */}
      <ModalDetalles
        actividad={actividadAVer}
        onClose={handleCloseDetailsModal}
        allActividades={actividades} // <-- MODIFICACIÓN
        onEdit={(act: Actividad) => {
          handleCloseDetailsModal();
          handleOpenEditModal(act);
        }}
      />
    </div>
  );
};

export default GestionActividadesPage;