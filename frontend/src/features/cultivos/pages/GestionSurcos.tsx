import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { obtenerLotes } from '../api/lotesApi';
import { obtenerSurcosPorLote, obtenerCultivos, crearSurco, actualizarSurco, eliminarSurco, actualizarEstadoSurco } from '../api/surcosApi';
import Modal from '../../../components/Modal';
import SurcoForm from '../components/SurcoForm';
import SurcoMap from '../components/SurcoMap';
import type { Lote, Cultivo, Surco, SurcoData } from '../interfaces/cultivos';

// --- Componente Principal ---
export default function GestionSurcos(): ReactElement {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<number | null>(null);
  const [surcos, setSurcos] = useState<Surco[]>([]);
  const [loadingSurcos, setLoadingSurcos] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSurco, setEditingSurco] = useState<Surco | null>(null);
  const [selectedSurco, setSelectedSurco] = useState<Surco | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchSurcos = (loteId: number) => {
    setLoadingSurcos(true);
    obtenerSurcosPorLote(loteId)
      .then(res => {
        const surcosData = res.data || [];
        setSurcos(surcosData);
        if (selectedSurco && surcosData.some((s: Surco) => s.id === selectedSurco.id)) {
            const updatedSelected = surcosData.find((s: Surco) => s.id === selectedSurco.id);
            setSelectedSurco(updatedSelected || surcosData[0] || null);
        } else {
            setSelectedSurco(surcosData[0] || null);
        }
      })
      .catch(() => toast.error(`Error al cargar surcos del lote ${loteId}.`))
      .finally(() => setLoadingSurcos(false));
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [lotesRes, cultivosRes] = await Promise.all([obtenerLotes(), obtenerCultivos()]);
        setLotes(lotesRes.data || []);
        setCultivos(cultivosRes.data || []);
        if (lotesRes.data && lotesRes.data.length > 0) {
          setSelectedLoteId(lotesRes.data[0].id);
        }
      } catch (error) {
        toast.error("Error al cargar datos iniciales.");
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedLoteId !== null) {
      fetchSurcos(selectedLoteId);
    }
  }, [selectedLoteId]);

  const handleLoteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLoteId(Number(e.target.value));
  };

  const handleOpenModal = (surco?: Surco) => {
    setEditingSurco(surco || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSurco(null);
  };

const handleSaveSurco = (data: SurcoData) => {
    // La lógica de guardado sigue funcionando igual
    const promise = editingSurco
      ? actualizarSurco(editingSurco.id, data)
      : crearSurco({ ...data, loteId: selectedLoteId! }); // Aseguramos loteId al crear

    toast.promise(promise, {
      loading: 'Guardando surco...',
      success: () => {
        if (selectedLoteId) fetchSurcos(selectedLoteId);
        handleCloseModal();
        const action = editingSurco ? 'actualizado' : 'creado';
        return `El surco '${data.nombre}' se ha ${action} correctamente.`;
      },
      error: (err: any) => err.response?.data?.message || 'No se pudo guardar el surco.',
    });
  };

  const handleDeleteSurco = (id: number) => {
    toast.error('¿Estás seguro de que quieres eliminar este surco?', {
      action: { label: 'Eliminar', onClick: () => {
        const promise = eliminarSurco(id);
        toast.promise(promise, {
          loading: 'Eliminando...',
          success: (res) => {
            if (selectedLoteId) fetchSurcos(selectedLoteId);
            return res.message;
          },
          error: 'Error al eliminar.',
        });
      }},
      cancel: { label: 'Cancelar', onClick: () => {} },
    });
  };

  const handleEstadoChange = (surcoId: number, nuevoEstado: string) => {
    const surco = surcos.find(s => s.id === surcoId);
    const nombreSurco = surco ? surco.nombre : `con ID ${surcoId}`;
    
    const promise = actualizarEstadoSurco(surcoId, nuevoEstado);
    
    toast.promise(promise, {
      loading: 'Actualizando estado...',
      success: () => {
        if(selectedLoteId) fetchSurcos(selectedLoteId);
        return `El surco '${nombreSurco}' se actualizó correctamente.`;
      },
      error: 'No se pudo actualizar el estado.'
    });
  };

  const getStatusTextColor = (estado: string) => {
    switch(estado) {
      case 'Disponible': return 'text-green-600';
      case 'En siembra': return 'text-blue-600';
      case 'En cosecha': return 'text-yellow-600';
      case 'Mantenimiento': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  };

   const formInitialData = editingSurco
    ? { // Datos para editar un surco existente
        id: editingSurco.id,
        nombre: editingSurco.nombre,
        descripcion: editingSurco.descripcion,
        cultivoId: editingSurco.cultivo?.id,
        loteId: editingSurco.lote.id,
      }
    : { // Datos para crear un surco nuevo
        loteId: selectedLoteId ?? undefined, // Convertimos null a undefined
      };

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Surcos</h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedLoteId || ''}
            onChange={handleLoteChange}
            className="border border-gray-300 rounded-lg p-2 bg-white shadow-sm"
          >
            {lotes.map(lote => <option key={lote.id} value={lote.id}>{lote.nombre}</option>)}
          </select>
          <button onClick={() => handleOpenModal()} disabled={!selectedLoteId} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition disabled:bg-gray-400">
            <Plus size={20} /> Nuevo Surco
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="mb-8 text-center">
          <div>
            <p className="text-sm text-gray-500">Total Surcos</p>
            <p className="text-3xl font-bold text-green-700">{surcos.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h3 className="font-semibold mb-2">Mapa de Surcos</h3>
            
             <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-gray-600">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-400"></div>Disponible</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-400"></div>En siembra</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-400"></div>En cosecha</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-gray-400"></div>Mantenimiento</div>
            </div>

            {loadingSurcos ? (
              <div className="flex items-center justify-center h-full text-gray-500">Cargando surcos...</div>
            ) : (
              <SurcoMap 
                surcos={surcos}
                selectedSurco={selectedSurco}
                onSelectSurco={setSelectedSurco}
              />
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-4">Detalles del Surco</h3>
            {selectedSurco ? (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-green-800">{selectedSurco.nombre}</h4>
                  <div className="flex gap-3">
                    <button onClick={() => handleOpenModal(selectedSurco)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                    <button onClick={() => handleDeleteSurco(selectedSurco.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold">Cultivo:</span> {selectedSurco.cultivo?.nombre || 'No asignado'}</p>
                  <p><span className="font-semibold">Descripción:</span> {selectedSurco.descripcion || 'Sin descripción'}</p>
                  
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">Estado:</p>
                    <select
                      value={selectedSurco.estado}
                      onChange={(e) => handleEstadoChange(selectedSurco.id, e.target.value)}
                      className={`font-medium border rounded-md p-1 text-xs bg-white ${getStatusTextColor(selectedSurco.estado)}`}
                    >
                      <option value="Disponible">Disponible</option>
                      <option value="En siembra">En siembra</option>
                      <option value="En cosecha">En cosecha</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDetailModalOpen(true)} 
                  className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Ver Detalles
                </button>
              </div>
            ) : <div className="text-center text-gray-500 p-4 border rounded-lg">Selecciona un surco para ver sus detalles.</div>}
          </div>
        </div>
      </div>

       <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSurco ? 'Editar Surco' : 'Agregar Nuevo Surco'}>
          <SurcoForm
          initialData={formInitialData} // Pasamos los datos preparados
          lotes={lotes}
          cultivos={cultivos}
          onSave={handleSaveSurco}
          onCancel={handleCloseModal}
        />
      </Modal>

      <Modal 
        isOpen={isDetailModalOpen && selectedSurco !== null} 
        onClose={() => setIsDetailModalOpen(false)} 
        title={`Detalles de ${selectedSurco?.nombre}`}
      >
        {selectedSurco && (
            <div className="p-4 space-y-3 text-base text-gray-700">
                <p><strong>Nombre:</strong> {selectedSurco.nombre}</p>
                <p><strong>Descripción:</strong> {selectedSurco.descripcion || 'N/A'}</p>
                <p><strong>Cultivo Asociado:</strong> {selectedSurco.cultivo?.nombre || 'Ninguno'}</p>
                <p><strong>Pertenece al Lote:</strong> {selectedSurco.lote.nombre}</p>
                <div className="flex items-center gap-2 pt-2">
                    <strong>Estado:</strong>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        selectedSurco.estado === 'Disponible' ? 'bg-green-100 text-green-800' :
                        selectedSurco.estado === 'En siembra' ? 'bg-blue-100 text-blue-800' :
                        selectedSurco.estado === 'En cosecha' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                        {selectedSurco.estado}
                    </span>
                </div>
            </div>
        )}
      </Modal>
    </div>
  );
}