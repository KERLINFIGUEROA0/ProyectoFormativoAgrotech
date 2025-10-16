import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Info, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { listarEpas, buscarEpasExternas } from '../api/fitosanitarioApi';
import type { Epa } from '../interfaces/fitosanitario';
import Modal from '../../../components/Modal';
import TratamientosRecomendadosModal from '../components/TratamientosRecomendadosModal';

const EpaCard = ({ epa, onClick }: { epa: Epa, onClick: () => void }) => {
  const getLabelClass = (type: string) => {
    switch (type) {
      case 'Enfermedad': return 'bg-red-500';
      case 'Plaga': return 'bg-orange-500';
      case 'Arvense': return 'bg-green-600';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div onClick={onClick} className="bg-white rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 group cursor-pointer">
      <div className="relative">
        <img className="w-full h-40 object-cover" src={epa.img || 'https://placehold.co/300x200'} alt={epa.nombre} onError={(e) => { e.currentTarget.src = 'https://placehold.co/300x200/cccccc/ffffff?text=Imagen+no+disponible'; }}/>
        <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-full text-white ${getLabelClass(epa.tipoEnfermedad)}`}>
          {epa.tipoEnfermedad}
        </span>
         {epa.id < 0 && (
          <span className="absolute top-2 left-2 text-xs font-semibold px-2 py-1 rounded-full text-white bg-blue-500">
            Externa
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 truncate">{epa.nombre}</h3>
        <p className="text-sm text-gray-600 mt-1 h-10">{epa.descripcion}</p>
      </div>
    </div>
  );
};

export default function GestionFitosanitarioPage() {
  const [allLocalEpas, setAllLocalEpas] = useState<Epa[]>([]);
  const [epasToShow, setEpasToShow] = useState<Epa[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEpa, setSelectedEpa] = useState<Epa | null>(null);
  const navigate = useNavigate();

  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  // Carga inicial de datos locales
  useEffect(() => {
    const fetchLocalData = async () => {
      try {
        setLoadingLocal(true);
        const data = await listarEpas();
        setAllLocalEpas(data || []);
        setEpasToShow(data || []);
      } catch (error) {
        toast.error('Error al cargar el catálogo local.');
      } finally {
        setLoadingLocal(false);
      }
    };
    fetchLocalData();
  }, []);
  
  // ✅ --- INICIO DE LA CORRECCIÓN CLAVE --- ✅
  // Efecto para manejar TODA la lógica de filtrado y búsqueda
  useEffect(() => {
    const updateDisplay = async () => {
      // Si la búsqueda se borra o es muy corta, filtramos solo los locales
      if (debouncedSearchTerm.length < 3) {
        const filtered = allLocalEpas.filter(epa => 
          (filterType === 'Todos' || epa.tipoEnfermedad === filterType) &&
          epa.nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
        setEpasToShow(filtered);
        return;
      }

      // Si la búsqueda es larga, buscamos externamente
      setLoadingExternal(true);
      try {
        const externalData = await buscarEpasExternas(debouncedSearchTerm);
        const localMatches = allLocalEpas.filter(epa => 
          epa.nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );

        const combinedMap = new Map<string, Epa>();
        [...externalData, ...localMatches].forEach(epa => {
          combinedMap.set(epa.nombre.toLowerCase(), epa);
        });

        const combined = Array.from(combinedMap.values());

        // Aplicamos el filtro de tipo al final
        const finalFiltered = combined.filter(epa => 
          filterType === 'Todos' || epa.tipoEnfermedad === filterType
        );

        setEpasToShow(finalFiltered);

      } catch (error) {
        toast.error('Error al combinar los resultados de búsqueda.');
      } finally {
        setLoadingExternal(false);
      }
    };

    updateDisplay();
  }, [debouncedSearchTerm, allLocalEpas, filterType]); // Este efecto se ejecuta si cambia la búsqueda, los datos locales o el filtro de tipo
  // ✅ --- FIN DE LA CORRECCIÓN CLAVE --- ✅

  const handleCardClick = (epa: Epa) => {
    if (epa.id < 0) {
      toast.info("Esta es una entrada de la base de datos externa y no tiene tratamientos locales asociados.");
      return;
    }
    setSelectedEpa(epa);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEpa(null);
  };

  const handleNavigateToPlanificar = () => {
    handleCloseModal();
    navigate('/tratamientos');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Fitosanitario</h1>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre (ej. Roya, Broca...)"
              className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="w-full border border-gray-300 rounded-lg p-2 bg-white shadow-sm" disabled>
            <option>Todos los cultivos</option>
          </select>
          <select
            className="w-full border border-gray-300 rounded-lg p-2 bg-white shadow-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="Todos">Todos los tipos</option>
            <option value="Enfermedad">Enfermedad</option>
            <option value="Plaga">Plaga</option>
            <option value="Arvense">Arvense</option>
          </select>
        </div>
      </div>
      
      {searchTerm.trim().length > 2 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <div className="flex">
                <div className="py-1"><Info className="h-5 w-5 text-blue-500" /></div>
                <div className="ml-3">
                    <p className="text-sm text-blue-700">
                    La búsqueda incluye resultados de una base de datos externa. Los elementos marcados como "Externa" son solo informativos.
                    </p>
                </div>
            </div>
        </div>
      )}
      
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-600">Resultados: {epasToShow.length} problemas encontrados</p>
        {loadingExternal && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="animate-spin" size={16} />
            Buscando en base de datos externa...
          </div>
        )}
      </div>
      
      {loadingLocal ? (
         <div className="text-center p-8 flex justify-center items-center gap-2">
           <Loader2 className="animate-spin" />
           Cargando catálogo...
         </div>
      ) : epasToShow.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          <p>No se encontraron resultados para tu búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {epasToShow.map(epa => (
            <EpaCard key={epa.id} epa={epa} onClick={() => handleCardClick(epa)} />
          ))}
        </div>
      )}
      
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="">
        <TratamientosRecomendadosModal 
          epa={selectedEpa} 
          onClose={handleCloseModal} 
          onPlanificar={handleNavigateToPlanificar}
        />
      </Modal>
    </div>
  );
}

