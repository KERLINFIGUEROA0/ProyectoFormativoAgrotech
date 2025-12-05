// src/features/actividades/components/ActividadCard.tsx
import React from 'react';
import { Edit, Trash2, Eye, MessageSquare, FileText, CheckCircle } from 'lucide-react'; // Importamos íconos
import type { Actividad } from '../interfaces/actividades';
import { getEstadoBadgeClass, getEstadoTexto } from '../utils/estadoUtils';

interface ActividadCardProps {
  actividad: Actividad;
  onEdit: (actividad: Actividad) => void;
  onDelete: (id: number) => void;
  onView: (actividad: Actividad) => void; // ✅ Nueva prop para ver detalles
  onResponder?: (actividad: Actividad) => void; // Nueva prop para responder
  onVerRespuestas?: (actividad: Actividad) => void; // Nueva prop para ver respuestas
  currentUserIdentificacion?: number; // Identificación del usuario actual
  currentUserRole?: string; // Rol del usuario actual
  currentUserNombre?: string; // Nombre completo del usuario actual
}

const ActividadCard: React.FC<ActividadCardProps> = ({ actividad, onEdit, onDelete, onView, onResponder, onVerRespuestas, currentUserIdentificacion, currentUserRole, currentUserNombre }) => {
  const estadoClase = getEstadoBadgeClass(actividad.estado);
  const estadoTexto = getEstadoTexto(actividad.estado);

  // Verificar si el usuario actual está asignado a la actividad
  const isUserAssigned = (() => {
    if (!currentUserNombre || !actividad.asignados) return false;
    try {
      const asignados = JSON.parse(actividad.asignados);
      return Array.isArray(asignados) && asignados.includes(currentUserNombre);
    } catch {
      return false;
    }
  })();

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 w-full">
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${estadoClase}`}>
              {estadoTexto}
            </span>
            <div className="flex items-center gap-2 mt-2">
              <h3 className="text-lg font-bold text-gray-900">{actividad.titulo}</h3>
              {actividad.archivoInicial && (
                <div className="flex items-center gap-1 text-blue-600" title="Tiene archivo inicial adjunto">
                  <FileText size={16} />
                  <span className="text-xs font-medium">Adjunto</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Asignados: {(() => {
                try {
                  return actividad.asignados ? JSON.parse(actividad.asignados).join(', ') : 'Ejecutar migraciones para ver asignados';
                } catch {
                  return 'Ejecutar migraciones para ver asignados';
                }
              })()}
            </p>
          </div>
          
          {/* ✅ Botones de Acción (Editar, Eliminar, Ver, Responder, Ver Respuestas) */}
          <div className="flex gap-1.5">
            {currentUserIdentificacion && onResponder && isUserAssigned && (
              (() => {
                const userRespuesta = actividad.respuestas?.find(r => r.usuario.identificacion === currentUserIdentificacion);

                // Estados posibles:
                // - Sin respuesta: puede responder
                // - Pendiente: esperando calificación, no puede responder
                // - Rechazado: puede corregir
                // - Aprobado: finalizado, no puede responder

                if (userRespuesta?.estado === 'aprobado') {
                  return (
                    <div className="flex items-center gap-1 p-1.5 rounded-full text-green-600 bg-green-100" title="Actividad Completada - Archivo Aprobado">
                      <CheckCircle size={16} />
                      <span className="text-xs font-medium">¡Éxito!</span>
                    </div>
                  );
                }

                if (userRespuesta?.estado === 'pendiente') {
                  return (
                    <div className="p-1.5 rounded-full text-yellow-600 bg-yellow-100" title="Enviado - Esperando Calificación">
                      <MessageSquare size={16} />
                    </div>
                  );
                }

                // Puede responder si no hay respuesta o está rechazada
                return (
                  <button
                    onClick={() => onResponder(actividad)}
                    className={`p-1.5 rounded-full ${
                      userRespuesta?.estado === 'rechazado'
                        ? 'text-red-600 bg-red-100 hover:bg-red-200'
                        : 'text-green-500 hover:bg-green-100'
                    }`}
                    title={
                      userRespuesta?.estado === 'rechazado'
                        ? "Corregir Respuesta Rechazada"
                        : "Responder Actividad"
                    }
                  >
                    <MessageSquare size={16} />
                  </button>
                );
              })()
            )}
            {currentUserRole && (currentUserRole.toLowerCase() === 'instructor' || currentUserRole.toLowerCase() === 'admin') && onVerRespuestas && (
              <button
                onClick={() => onVerRespuestas(actividad)}
                className="p-1.5 text-purple-500 hover:bg-purple-100 rounded-full"
                title="Ver Respuestas"
              >
                <FileText size={16} />
              </button>
            )}
            <button onClick={() => onEdit(actividad)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-full" title="Editar">
              <Edit size={16} />
            </button>
            <button onClick={() => onDelete(actividad.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full" title="Eliminar">
              <Trash2 size={16} />
            </button>
            <button onClick={() => onView(actividad)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full" title="Ver Detalles">
              <Eye size={16} /> {/* Ícono de Ojo para ver detalles */}
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-3 h-12 overflow-hidden">
          {actividad.descripcion || 'Sin descripción.'}
        </p>


        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
          <div>
            <p className="text-gray-500">Cultivo:</p>
            <p className="font-semibold">{actividad.cultivo?.nombre || 'No especificado'}</p>
          </div>
          <div>
            <p className="text-gray-500">Fecha Límite:</p>
            <p className="font-semibold text-right">{new Date(actividad.fecha).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActividadCard;