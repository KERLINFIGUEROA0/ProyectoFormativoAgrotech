// frontend/src/features/cultivos/components/SurcoMap.tsx
import type { ReactElement } from 'react';
import type { Surco } from '../interfaces/cultivos'; // --- INTERFAZ IMPORTADA ---



interface SurcoMapProps {
  surcos: Surco[];
  selectedSurco: Surco | null;
  onSelectSurco: (surco: Surco) => void;
}

// --- Lógica de Estilos (sin cambios) ---
const getSurcoBackgroundColor = (surco: Surco, isSelected: boolean): string => {
  const baseClasses = "flex flex-col items-center justify-center py-2 px-0 rounded-lg cursor-pointer text-white text-xs font-bold transition-transform transform hover:scale-105 shadow-md";

  if (isSelected) {
    switch(surco.estado) {
      case 'Disponible': return `${baseClasses} bg-green-600 ring-4 ring-offset-2 ring-green-500`;
      case 'En siembra': return `${baseClasses} bg-blue-600 ring-4 ring-offset-2 ring-blue-500`;
      case 'En cosecha': return `${baseClasses} bg-yellow-500 ring-4 ring-offset-2 ring-yellow-500`;
      case 'Mantenimiento': return `${baseClasses} bg-gray-600 ring-4 ring-offset-2 ring-gray-500`;
      default: return `${baseClasses} bg-gray-600 ring-4 ring-offset-2 ring-gray-500`;
    }
  } else {
    switch(surco.estado) {
      case 'Disponible': return `${baseClasses} bg-green-400 hover:bg-green-500`;
      case 'En siembra': return `${baseClasses} bg-blue-400 hover:bg-blue-500`;
      case 'En cosecha': return `${baseClasses} bg-yellow-400 hover:bg-yellow-500`;
      case 'Mantenimiento': return `${baseClasses} bg-gray-400 hover:bg-gray-500`;
      default: return `${baseClasses} bg-gray-400 hover:bg-gray-500`;
    }
  }
};

// --- Componente Principal del Mapa ---
export default function SurcoMap({ surcos, selectedSurco, onSelectSurco }: SurcoMapProps): ReactElement {
  return (
    <div className="bg-green-100 border-2 border-dashed border-green-400 rounded-xl p-4 h-[320px]">
      {surcos.length > 0 ? (
        <div className="flex flex-nowrap gap-4 items-center h-full overflow-x-auto pb-2">
          {surcos.map((surco) => (
            <div
              key={surco.id}
              onClick={() => onSelectSurco(surco)}
              className={getSurcoBackgroundColor(surco, selectedSurco?.id === surco.id)}
              style={{ width: '50px', height: '60%', flexShrink: 0 }} 
            >
              <span className="[writing-mode:vertical-rl] transform rotate-180 font-semibold whitespace-nowrap">
                {surco.nombre}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-green-800">
          <p>Este lote no tiene surcos registrados.</p>
        </div>
      )}
    </div>
  );
}