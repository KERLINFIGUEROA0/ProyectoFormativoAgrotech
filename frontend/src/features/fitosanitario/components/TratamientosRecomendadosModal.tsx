import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Calendar, Info } from 'lucide-react';
import type { Epa, Tratamiento } from '../interfaces/fitosanitario';
import { listarTratamientosPorEpa } from '../api/fitosanitarioApi';
import { Button } from '@heroui/react';

interface TratamientosRecomendadosModalProps {
  epa: Epa | null;
  onClose: () => void;
  onPlanificar: () => void; // Función para navegar a la página de gestión
}

export default function TratamientosRecomendadosModal({ epa, onClose, onPlanificar }: TratamientosRecomendadosModalProps) {
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (epa) {
      const fetchTratamientos = async () => {
        setLoading(true);
        try {
          const data = await listarTratamientosPorEpa(epa.id);
          setTratamientos(data);
        } catch (error) {
          toast.error(`No se pudieron cargar los tratamientos para ${epa.nombre}.`);
        } finally {
          setLoading(false);
        }
      };
      fetchTratamientos();
    }
  }, [epa]);

  if (!epa) return null;

  return (
    <div className="p-6 relative">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        aria-label="Cerrar"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Tratamientos para {epa.nombre}</h2>
      <p className="text-gray-600 mb-4">{epa.descripcion}</p>
      
      {loading ? (
        <p>Cargando tratamientos...</p>
      ) : tratamientos.length > 0 ? (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {tratamientos.map(t => (
            <div key={t.id} className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-semibold text-green-700 flex items-center gap-2"><ShieldCheck size={18} /> {t.descripcion}</h4>
              <p className="text-sm text-gray-500"><Info size={14} className="inline mr-1" /> Tipo: {t.tipo}</p>
              <p className="text-sm text-gray-500"><Calendar size={14} className="inline mr-1" /> Estado Base: {t.estado}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-4">No hay tratamientos recomendados para esta amenaza.</p>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={onPlanificar} color="success">
          Ir a Planificar Tratamiento
        </Button>
      </div>
    </div>
  );
}