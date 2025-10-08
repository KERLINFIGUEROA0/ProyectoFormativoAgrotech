// src/features/actividades/components/ActividadCard.tsx
import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import type { Actividad } from '../interfaces/actividades';  
import { getEstadoBadgeClass, getEstadoTexto } from '../utils/estadoUtils';

interface ActividadCardProps {
  actividad: Actividad;
  onEdit: (actividad: Actividad) => void;
  onDelete: (id: number) => void;
}

const ActividadCard: React.FC<ActividadCardProps> = ({ actividad, onEdit, onDelete }) => {
  const estadoClase = getEstadoBadgeClass(actividad.estado);
  const estadoTexto = getEstadoTexto(actividad.estado);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 w-full max-w-sm">
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${estadoClase}`}>
              {estadoTexto}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-2">{actividad.titulo}</h3>
            <p className="text-sm text-gray-500">
              Asignado a: {actividad.usuario?.nombre || 'N/A'} {actividad.usuario?.apellidos || ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onEdit(actividad)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full">
              <Edit size={16} />
            </button>
            <button onClick={() => onDelete(actividad.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full">
              <Trash2 size={16} />
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