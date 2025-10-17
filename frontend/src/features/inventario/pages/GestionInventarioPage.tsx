import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Bell, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { listarMateriales, crearMaterial, actualizarMaterial, subirImagenMaterial, desactivarMaterial, reactivarMaterial } from '../api/inventarioApi';
import Modal from '../../../components/Modal';
import MaterialForm from '../components/MaterialForm';
import { type Material, type MaterialData } from '../interfaces/inventario';

const API_URL = import.meta.env.VITE_BACKEND_URL;

const getStatusInfo = (cantidad: number) => {
  if (cantidad <= 10) return { text: 'Crítico', bg: 'bg-red-100', text_color: 'text-red-800' };
  if (cantidad <= 25) return { text: 'Stock Bajo', bg: 'bg-yellow-100', text_color: 'text-yellow-800' };
  return { text: 'Normal', bg: 'bg-green-100', text_color: 'text-green-800' };
};

const formatarContenido = (peso: number | string | null, tipoMedida: string): string | null => {
    const pesoNumerico = Number(peso);
    if (!pesoNumerico || pesoNumerico <= 0) return null;

    const esLiquido = tipoMedida === 'Litro' || tipoMedida === 'Mililitro';

    if (pesoNumerico < 1) {
        const valorPequeño = Number((pesoNumerico * 1000).toFixed(3));
        return esLiquido ? `${valorPequeño} ml` : `${valorPequeño} g`;
    }

    const valorGrande = Number(pesoNumerico.toFixed(3));
    return esLiquido ? `${valorGrande} L` : `${valorGrande} kg`;
}

export default function GestionInventarioPage() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const navigate = useNavigate();

  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroUbicacion, setFiltroUbicacion] = useState('Todas');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  

  const fetchData = async () => {
    try {
      const resMateriales = await listarMateriales();
      setMateriales(resMateriales.data || []);
    } catch (error) {
      toast.error("Error al cargar los materiales.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (material: Material | null = null) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMaterial(null);
  };

  const handleSave = async (data: MaterialData) => {
    const { imageFile, ...materialData } = data;
    const toastId = toast.loading("Guardando material...");

    try {
      let materialId: number;
      if (editingMaterial) {
        const res = await actualizarMaterial(editingMaterial.id, materialData);
        materialId = res.data.id;
        toast.success("Material actualizado con éxito.", { id: toastId });
      } else {
        const res = await crearMaterial(materialData);
        materialId = res.data.id;
        toast.success("Material creado con éxito.", { id: toastId });
      }

      if (imageFile && materialId) {
        await subirImagenMaterial(materialId, imageFile);
        toast.info("Imagen subida correctamente.");
      }

      fetchData();
      closeModal();
    } catch (error: any) {
      const errorMessage = Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error.response?.data?.message || "No se pudo guardar el material.";
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleToggleEstado = async (material: Material) => {
    const action = material.estado ? 'Desactivando...' : 'Activando...';
    const toastId = toast.loading(action);

    try {
      if (material.estado) {
        await desactivarMaterial(material.id);
        toast.success("Material desactivado.", { id: toastId });
      } else {
        await reactivarMaterial(material.id);
        toast.success("Material activado.", { id: toastId });
      }
      fetchData();
    } catch {
      toast.error("No se pudo cambiar el estado.", { id: toastId });
    }
  };

  const materialesFiltrados = useMemo(() => {
    return materiales.filter(mat => {
      const busquedaLower = filtroBusqueda.toLowerCase();
      const coincideBusqueda = busquedaLower === '' ||
                             mat.nombre.toLowerCase().includes(busquedaLower) ||
                             (mat.descripcion && mat.descripcion.toLowerCase().includes(busquedaLower));

      const coincideCategoria = filtroCategoria === 'Todas' || mat.tipoMaterial === filtroCategoria;
      const coincideUbicacion = filtroUbicacion === 'Todas' || mat.ubicacion === filtroUbicacion;
      const estadoStock = getStatusInfo(mat.cantidad).text;
      const coincideEstado = filtroEstado === 'Todos' || estadoStock === filtroEstado;

      return coincideBusqueda && coincideCategoria && coincideUbicacion && coincideEstado;
    });
  }, [materiales, filtroBusqueda, filtroCategoria, filtroUbicacion, filtroEstado]);

  const categoriasUnicas = useMemo(() => [...new Set(materiales.map(m => m.tipoMaterial).filter(Boolean))], [materiales]);
  const ubicacionesUnicas = useMemo(() => [...new Set(materiales.map(m => m.ubicacion).filter(Boolean))], [materiales]);

  const formInitialData = editingMaterial ? {
    ...editingMaterial,
    pesoPorUnidad: editingMaterial.pesoPorUnidad === null ? undefined : editingMaterial.pesoPorUnidad,
  } : {};

  return (
    <div className="p-2 sm:p-6 bg-gray-50 min-h-full font-sans">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Gestión De Inventario</h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 outline-none"
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
            />
          </div>
          <button className="p-2 rounded-lg border hover:bg-gray-100">
            <Bell size={20} className="text-gray-600" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar productos..."
          className="border rounded-lg p-2 w-full text-sm"
          value={filtroBusqueda}
          onChange={(e) => setFiltroBusqueda(e.target.value)}
        />
        <select
          className="border rounded-lg p-2 w-full bg-white text-sm"
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
        >
          <option value="Todas">Todas las categorías</option>
          {categoriasUnicas.map(cat => cat && <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select
          className="border rounded-lg p-2 w-full bg-white text-sm"
          value={filtroUbicacion}
          onChange={(e) => setFiltroUbicacion(e.target.value)}
        >
          <option value="Todas">Todas las ubicaciones</option>
          {ubicacionesUnicas.map(ubi => ubi && <option key={ubi} value={ubi}>{ubi}</option>)}
        </select>
        <select
          className="border rounded-lg p-2 w-full bg-white text-sm"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="Todos">Todos los estados</option>
          <option value="Normal">Normal</option>
          <option value="Stock Bajo">Stock Bajo</option>
          <option value="Crítico">Crítico</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Producto</th>
                <th className="px-6 py-3 text-left font-medium">Categoría</th>
                <th className="px-6 py-3 text-left font-medium">Cantidad</th>
                <th className="px-6 py-3 text-left font-medium">Ubicación</th>
                <th className="px-6 py-3 text-left font-medium">Valor Unit.</th>
                <th className="px-6 py-3 text-left font-medium">Stock</th>
                <th className="px-6 py-3 text-center font-medium">Estado</th>
                <th className="px-6 py-3 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {materialesFiltrados.map((mat) => {
                const status = getStatusInfo(mat.cantidad);

                // --- ✅ CORRECCIÓN AQUÍ ---
                // Le pasamos el segundo argumento (mat.tipoMedida) a la función.
                const textoContenido = formatarContenido(mat.pesoPorUnidad , mat.tipoEmpaque);

                return (
                  <tr key={mat.id} className={`hover:bg-gray-50 ${!mat.estado ? 'bg-gray-100 text-gray-400' : ''}`}>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <img
                        className={`w-10 h-10 object-cover rounded-md ${!mat.estado ? 'filter grayscale' : ''}`}
                        src={mat.img ? `${API_URL}/uploads/${mat.img}` : 'https://via.placeholder.com/40'}
                        alt={mat.nombre}
                      />
                      <div onClick={() => mat.estado && navigate(`/stock/${mat.id}`)} className={mat.estado ? "cursor-pointer" : ""}>
                        <p className={`font-semibold ${mat.estado ? 'text-gray-800' : ''}`}>{mat.nombre}</p>
                        <p className="text-xs text-gray-500">CÓDIGO: MAT-{String(mat.id).padStart(3, '0')}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">{mat.tipoMaterial}</span></td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">{mat.cantidad} {mat.tipoEmpaque}</div>
                      {textoContenido && (
                        <div className="text-xs text-gray-500">{textoContenido} / und.</div>
                      )}
                    </td>
                    <td className="px-6 py-4">{mat.ubicacion}</td>
                    <td className="px-6 py-4">${Number(mat.precio).toLocaleString('es-CO')}</td>
                    <td className="px-6 py-4"><span className={`text-xs font-bold px-2 py-1 rounded-full ${status.bg} ${status.text_color}`}>{status.text}</span></td>
                    <td className="px-6 py-4 text-center">
                        <label className="flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={mat.estado} onChange={() => handleToggleEstado(mat)} />
                                <div className={`block w-10 h-6 rounded-full ${mat.estado ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${mat.estado ? 'transform translate-x-full' : ''}`}></div>
                            </div>
                        </label>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openModal(mat)} className="p-1.5 text-gray-500 hover:text-blue-600"><Edit size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <button className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-100"><ChevronLeft size={16}/></button>
            <span className="text-sm text-gray-600">Página 1 de 10</span>
            <button className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-100"><ChevronRight size={16}/></button>
        </div>
        <div className="flex flex-wrap gap-2">
            <button onClick={() => openModal()} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-orange-600 shadow-sm">
                <Plus size={16}/> Añadir Producto
            </button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingMaterial ? 'Editar Material' : 'Registrar Nuevo Material'}>
        <MaterialForm initialData={formInitialData} onSave={handleSave} onCancel={closeModal} />
      </Modal>
    </div>
  );
}