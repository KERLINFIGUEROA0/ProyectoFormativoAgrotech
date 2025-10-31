// src/features/actividades/pages/GestionActividadesPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { ClipboardList, Loader2, CheckCircle, Edit, Calendar, User, FileText, Bell } from 'lucide-react';

import ActividadCard from '../components/ActividadCard';
import FormularioActividad from '../components/FormularioActividad';
import Modal from '../../../components/Modal';
import { useAuth } from '../../../context/AuthContext';
import type {
  Actividad,
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
import { getEstadoTexto } from '../utils/estadoUtils';

// --- Componente para mostrar Detalles de la Actividad ---
interface ModalDetallesProps {
    actividad: Actividad | null;
    onClose: () => void;
    onEdit: (actividad: Actividad) => void;
}

const ModalDetalles: React.FC<ModalDetallesProps> = ({ actividad, onClose, onEdit }) => {
    if (!actividad) return null;

    // 🔍 Log adicional: Verificar accesibilidad de la URL
    if (actividad.img) {
        try {
            // Intentar parsear como JSON array primero
            const imagenes = JSON.parse(actividad.img);
            if (Array.isArray(imagenes)) {
                // Es un array de imágenes
                imagenes.forEach((img: string, index: number) => {
                    const imageUrl = `${import.meta.env.VITE_BACKEND_URL}/uploads/actividades/${img}`
                    fetch(imageUrl, { method: 'HEAD' })
                        .then(response => {
                            console.log(`🔍 Respuesta del servidor para imagen ${index + 1}:`, {
                                url: imageUrl,
                                status: response.status,
                                statusText: response.statusText,
                                headers: Object.fromEntries(response.headers.entries()),
                                ok: response.ok
                            });
                        })
                        .catch(error => {
                            console.error(`🔍 Error al verificar imagen ${index + 1}:`, {
                                url: imageUrl,
                                error: error.message,
                                backendUrl: import.meta.env.VITE_BACKEND_URL,
                                img: img
                            });
                            // Verificar si el error es de resolución de nombre (DNS)
                            if (error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('Name resolution failure')) {
                                console.error("🚨 ERROR DE DNS: No se puede resolver el dominio del backend. Verificar configuración de VITE_BACKEND_URL.");
                            }
                        });
                });
            } else {
                // Es una sola imagen
                const imageUrl = `${import.meta.env.VITE_BACKEND_URL}/uploads/actividades/${actividad.img}`;
                console.log("🔍 Intentando verificar URL de imagen única:", imageUrl);
                fetch(imageUrl, { method: 'HEAD' })
                    .then(response => {
                        console.log("🔍 Respuesta del servidor para imagen única:", {
                            url: imageUrl,
                            status: response.status,
                            statusText: response.statusText,
                            headers: Object.fromEntries(response.headers.entries()),
                            ok: response.ok
                        });
                    })
                    .catch(error => {
                        console.error("🔍 Error al verificar imagen única:", {
                            url: imageUrl,
                            error: error.message,
                            backendUrl: import.meta.env.VITE_BACKEND_URL,
                            img: actividad.img
                        });
                        // Verificar si el error es de resolución de nombre (DNS)
                        if (error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('Name resolution failure')) {
                            console.error("🚨 ERROR DE DNS: No se puede resolver el dominio del backend. Verificar configuración de VITE_BACKEND_URL.");
                        }
                    });
            }
        } catch (parseError) {
            // No es JSON, tratar como string único
            const imageUrl = `${import.meta.env.VITE_BACKEND_URL}/uploads/actividades/${actividad.img}`;
            console.log("🔍 Intentando verificar URL de imagen (string único):", imageUrl);
            fetch(imageUrl, { method: 'HEAD' })
                .then(response => {
                    console.log("🔍 Respuesta del servidor para imagen string:", {
                        url: imageUrl,
                        status: response.status,
                        statusText: response.statusText,
                        headers: Object.fromEntries(response.headers.entries()),
                        ok: response.ok
                    });
                })
                .catch(error => {
                    console.error("🔍 Error al verificar imagen string:", {
                        url: imageUrl,
                        error: error.message,
                        backendUrl: import.meta.env.VITE_BACKEND_URL,
                        img: actividad.img
                    });
                    // Verificar si el error es de resolución de nombre (DNS)
                    if (error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('Name resolution failure')) {
                        console.error("🚨 ERROR DE DNS: No se puede resolver el dominio del backend. Verificar configuración de VITE_BACKEND_URL.");
                    }
                });
        }
    }

    const estadoTexto = getEstadoTexto(actividad.estado);
    const fechaProgramada = new Date(actividad.fecha).toLocaleDateString();
    const nombreCompleto = `${actividad.usuario?.nombre || 'N/A'} ${actividad.usuario?.apellidos || ''}`;

    return (
        // ✅ CORRECCIÓN: Se eliminó la propiedad "size" que no existe en el componente Modal.
        <Modal isOpen={!!actividad} onClose={onClose} title="Detalles de Actividad">
            <div className="space-y-6">
                
                <div className={`p-4 rounded-t-lg flex justify-between items-center text-white font-bold ${actividad.estado === 'completado' ? 'bg-green-600' : 'bg-blue-600'}`}>
                    <h2 className="text-xl">Detalles de Actividad</h2>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full bg-white text-gray-800`}>
                        {estadoTexto}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                        <h3 className="font-bold text-gray-700">Información Básica</h3>
                        <p className="text-sm"><strong>Nombre:</strong> {actividad.titulo}</p>
                        <p className="text-sm"><strong>Cultivo/Lote:</strong> {actividad.cultivo?.nombre || 'No especificado'}</p>
                    </div>

                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                        <h3 className="font-bold text-gray-700">Programación y Responsable</h3>
                        <p className="text-sm flex items-center gap-2"><Calendar size={14} className="text-blue-500" /> <strong>Fecha Programada:</strong> {fechaProgramada}</p>
                        <p className="text-sm flex items-center gap-2"><User size={14} className="text-blue-500" /> <strong>Aprendiz Asignado:</strong> {nombreCompleto}</p>
                    </div>
                </div>

                <div className="p-4 border-t pt-4">
                    <h3 className="font-bold text-gray-700 mb-2">Descripción Completa</h3>
                    <p className="text-gray-600 text-sm">{actividad.descripcion || 'No hay descripción detallada.'}</p>
                </div>

                {/* Sección de Imágenes */}
                {actividad.img && (
                    <div className="p-4 border-t pt-4">
                        <h3 className="font-bold text-gray-700 mb-2">Imágenes de la Actividad</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(() => {
                                try {
                                    const imagenes = JSON.parse(actividad.img);
                                    return imagenes.map((img: string, index: number) => (
                                        <div key={index} className="relative">
                                                <img
                                                    src={`${import.meta.env.VITE_BACKEND_URL}/uploads/actividades/${img}`}
                                                    alt={`Imagen ${index + 1} de ${actividad.titulo}`}
                                                    className="w-full h-48 object-cover rounded-lg border"
                                                    onLoad={() => console.log("✅ Imagen cargada exitosamente:", {
                                                        src: `${import.meta.env.VITE_BACKEND_URL}/uploads/actividades/${img}`,
                                                        actividadId: actividad.id,
                                                        index
                                                    })}
                                                    onError={(e) => {
                                                        console.error("❌ Error cargando imagen:", {
                                                            src: e.currentTarget.src,
                                                            actividadId: actividad.id,
                                                            img,
                                                            backendUrl: import.meta.env.VITE_BACKEND_URL,
                                                            index,
                                                            errorEvent: e,
                                                            naturalWidth: e.currentTarget.naturalWidth,
                                                            naturalHeight: e.currentTarget.naturalHeight
                                                        });
                                                        // Verificar si el error es ERR_NAME_NOT_RESOLVED
                                                        if (e.currentTarget.src.includes('data:image') || e.currentTarget.src.includes('placeholder')) {
                                                            console.warn("⚠️ Ya se está usando un placeholder local. Error persistente en la carga de imagen.");
                                                        } else {
                                                            console.log("🔄 Aplicando fallback a placeholder local debido a error de carga.");
                                                            // Usar data URL para evitar dependencias externas
                                                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4=';
                                                        }
                                                    }}
                                                />
                                            </div>
                                    ));
                                } catch (error) {
                                    console.error("❌ Error parseando imágenes:", {
                                        img: actividad.img,
                                        error: error instanceof Error ? error.message : String(error)
                                    });
                                    // Si el parseo falla, intentar tratar img como string único
                                    if (typeof actividad.img === 'string' && actividad.img.trim()) {
                                        return (
                                            <div key={0} className="relative">
                                                <img
                                                    src={`${import.meta.env.VITE_BACKEND_URL}/uploads/actividades/${actividad.img}`}
                                                    alt={`Imagen de ${actividad.titulo}`}
                                                    className="w-full h-48 object-cover rounded-lg border"
                                                    onLoad={() => console.log("✅ Imagen única cargada exitosamente:", {
                                                        src: `${import.meta.env.VITE_BACKEND_URL}/uploads/actividades/${actividad.img}`,
                                                        actividadId: actividad.id
                                                    })}
                                                    onError={(e) => {
                                                        console.error("❌ Error cargando imagen única:", {
                                                            src: e.currentTarget.src,
                                                            actividadId: actividad.id,
                                                            img: actividad.img,
                                                            backendUrl: import.meta.env.VITE_BACKEND_URL,
                                                            errorEvent: e
                                                        });
                                                        // Verificar si el error es ERR_NAME_NOT_RESOLVED
                                                        if (e.currentTarget.src.includes('data:image') || e.currentTarget.src.includes('placeholder')) {
                                                            console.warn("⚠️ Ya se está usando un placeholder local. Error persistente en la carga de imagen.");
                                                        } else {
                                                            console.log("🔄 Aplicando fallback a placeholder local debido a error de carga.");
                                                            // Usar data URL para evitar dependencias externas
                                                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4=';
                                                        }
                                                    }}
                                                />
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="col-span-full text-center text-red-500">
                                            Error al cargar las imágenes: formato inválido
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                )}
                
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
  const { userData } = useAuth();
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [, setUsuarios] = useState<UsuarioSimple[]>([]);
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
      console.log("🔍 Diagnóstico de actividades cargadas:", actividadesData?.map((act: Actividad) => ({
        id: act.id,
        titulo: act.titulo,
        img: act.img,
        imgPresente: !!act.img,
        imgTipo: typeof act.img,
        imgLength: act.img ? act.img.length : 0,
        backendUrl: import.meta.env.VITE_BACKEND_URL,
        urlConstruida: act.img ? `${import.meta.env.VITE_BACKEND_URL}/uploads/actividades/${act.img}` : null
      })));
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

  // Función para mostrar notificaciones de actividades pendientes
  const mostrarNotificacionesPendientes = useCallback(() => {
    if (!userData || !actividades.length) return;

    const actividadesPendientesUsuario = actividades.filter(act =>
      act.estado === 'pendiente' &&
      act.usuario?.identificacion === userData.identificacion
    );

    if (actividadesPendientesUsuario.length > 0) {
      toast.warning(
        `Tienes ${actividadesPendientesUsuario.length} actividad(es) pendiente(s) por completar.`,
        {
          description: 'Revisa tus actividades asignadas.',
          duration: 8000,
          action: {
            label: 'Ver Actividades',
            onClick: () => {
              // Filtrar por pendientes para mostrar solo las del usuario
              setFiltroEstado('pendiente');
            }
          }
        }
      );
    }
  }, [actividades, userData]);

  // Mostrar notificaciones cuando se cargan las actividades
  useEffect(() => {
    if (!cargando && actividades.length > 0) {
      mostrarNotificacionesPendientes();
    }
  }, [cargando, actividades, mostrarNotificacionesPendientes]);

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
  const handleSave = async (payload: FormData | UpdateActividadPayload) => { // Acepta FormData
    const isEditing = actividadAEditar && actividadAEditar.id;
    const toastId = toast.loading(isEditing ? 'Actualizando...' : 'Creando...');
    
    try {
      if (isEditing) {
        // La edición no maneja archivos por ahora, así que sigue enviando JSON
        await actualizarActividad(actividadAEditar.id!, payload as UpdateActividadPayload);
      } else {
        // ✅ La creación ahora envía el FormData directamente
        await registrarActividad(payload as FormData);
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

  // Función para exportar PDF
  const exportarPDF = useCallback(async () => {
    try {
      const { jsPDF } = await import('jspdf');
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
        new Date(act.fecha).toLocaleDateString('es-ES'),
        getEstadoTexto(act.estado),
        act.descripcion || 'Sin descripción'
      ]);

      // Importar autoTable dinámicamente
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

  if (cargando) return <div className="text-center mt-8">Cargando...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Actividades</h1>
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