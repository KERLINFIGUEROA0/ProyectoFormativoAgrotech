import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
// --- ✅ 1. Importamos AlertTriangle ---
import { Filter, Plus, Bell, Edit, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';


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



const formatarContenido = (peso: number | string | null, tipoMedida: string | null | undefined): string | null => {
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
  const [filtroTipoCategoria, setFiltroTipoCategoria] = useState('Todas');
  const [filtroUbicacion, setFiltroUbicacion] = useState('Todas');
  const [filtroEstadoStock, setFiltroEstadoStock] = useState('Todos');
  const [filtroProveedor, setFiltroProveedor] = useState('Todos');
  const [filtroEstadoMaterial, setFiltroEstadoMaterial] = useState('Todos');
  const [showFilters, setShowFilters] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  // --- ✅ CAMBIO AQUÍ ---
  const [itemsPerPage] = useState(10); // Cambiado de 20 a 10

  const [sortConfig, setSortConfig] = useState<{ key: keyof Material | null; direction: 'ascending' | 'descending' }>({ key: 'nombre', direction: 'ascending' });

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

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroBusqueda, filtroTipoCategoria, filtroUbicacion, filtroEstadoStock, filtroProveedor, filtroEstadoMaterial, sortConfig]);


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

  // --- ✅ 2. Añadimos un Memo para contar los items críticos ---
  const itemsCriticos = useMemo(() => {
    // Contamos solo los materiales activos que están en estado crítico (<= 10)
    return materiales.filter(mat => mat.estado && mat.cantidad <= 10);
  }, [materiales]);

  const materialesFiltrados = useMemo(() => {
    let filtrados = [...materiales].filter(mat => {
      const busquedaLower = filtroBusqueda.toLowerCase();
      const coincideBusqueda = busquedaLower === '' ||
        mat.nombre.toLowerCase().includes(busquedaLower) ||
        (mat.descripcion && mat.descripcion.toLowerCase().includes(busquedaLower));

      const coincideCategoria = filtroTipoCategoria === 'Todas' || mat.tipoCategoria === filtroTipoCategoria;
      const coincideUbicacion = filtroUbicacion === 'Todas' || mat.ubicacion === filtroUbicacion;
      const coincideProveedor = filtroProveedor === 'Todos' || mat.proveedor === filtroProveedor;

      const estadoStock = getStatusInfo(mat.cantidad).text;
      const coincideEstadoStock = filtroEstadoStock === 'Todos' || estadoStock === filtroEstadoStock;

      const coincideEstadoMaterial = filtroEstadoMaterial === 'Todos' ||
        (filtroEstadoMaterial === 'Activo' && mat.estado) ||
        (filtroEstadoMaterial === 'Inactivo' && !mat.estado);

      return coincideBusqueda && coincideCategoria && coincideUbicacion && coincideProveedor && coincideEstadoStock && coincideEstadoMaterial;
    });

    if (sortConfig.key) {
      filtrados.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtrados;
  }, [materiales, filtroBusqueda, filtroTipoCategoria, filtroUbicacion, filtroEstadoStock, filtroProveedor, filtroEstadoMaterial, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMateriales = materialesFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(materialesFiltrados.length / itemsPerPage);

  const tiposCategoriaUnicos = useMemo(() => [...new Set(materiales.map(m => m.tipoCategoria).filter(Boolean))], [materiales]);
  const ubicacionesUnicas = useMemo(() => [...new Set(materiales.map(m => m.ubicacion).filter(Boolean))], [materiales]);
  const proveedoresUnicos = useMemo(() => [...new Set(materiales.map(m => m.proveedor).filter(Boolean))], [materiales]);

  const formInitialData = editingMaterial ? {
    ...editingMaterial,
    pesoPorUnidad: editingMaterial.pesoPorUnidad === null ? undefined : editingMaterial.pesoPorUnidad,
  } : {};

  const requestSort = (key: keyof Material) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // --- ✅ INICIO DE LA CORRECCIÓN: Componente de icono de ordenamiento ---
  const SortIcon = ({ columnKey }: { columnKey: keyof Material }) => {
    if (sortConfig.key !== columnKey) {
      // Devolvemos un ícono invisible para mantener el espacio
      return <ArrowUpDown size={12} className="text-transparent" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp size={12} className="text-blue-600" />;
    }
    return <ArrowDown size={12} className="text-blue-600" />;
  };
  // --- ✅ FIN DE LA CORRECCIÓN ---

  return (

    <div className="bg-white shadow-xl rounded-xl p-6 w-full flex flex-col h-full">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4 flex-shrink-0">
        <h1 className="text-3xl font-bold text-gray-800">Gestión De Inventario</h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button className="p-2 rounded-lg border hover:bg-gray-100">
            <Bell size={20} className="text-gray-600" />
          </button>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm text-sm hover:bg-green-700">
            <Plus size={16} /> Añadir Producto
          </button>
        </div>
      </header>

      {/* --- ✅ 3. NUEVO BANNER DE ALERTA --- */}
      {itemsCriticos.length > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 mb-6 bg-red-100 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <h4 className="font-bold text-red-800">Stock Crítico</h4>
              <p className="text-sm text-red-700">
                Tienes {itemsCriticos.length} material(es) que necesitan reabastecimiento urgente.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setFiltroEstadoStock('Crítico')}
            className="flex-shrink-0 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 shadow-sm"
          >
            Ver Críticos
          </button>
        </div>
      )}
      {/* --- FIN DE BANNER DE ALERTA --- */}


      <div className="flex items-center gap-4 mb-6 flex-shrink-0">
        <input
          type="text"
          placeholder="Buscar productos..."
          className="border rounded-lg p-2 w-full max-w-xs text-sm"
          value={filtroBusqueda}
          onChange={(e) => setFiltroBusqueda(e.target.value)}
        />
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
          >
            <Filter size={18} />
            Filtros
          </button>

          {showFilters && (
            <div className="absolute left-0 mt-2 w-72 bg-white border rounded-lg shadow-lg p-4 z-20">
              <div className="flex flex-col gap-3">
                <select className="border rounded-lg p-2 w-full bg-white text-sm" value={filtroTipoCategoria} onChange={(e) => setFiltroTipoCategoria(e.target.value)}>
                  <option value="Todas">Todas las categorías</option>
                  {tiposCategoriaUnicos.map(cat => cat && <option key={cat} value={cat}>{cat}</option>)}
                </select>

                <select className="border rounded-lg p-2 w-full bg-white text-sm" value={filtroUbicacion} onChange={(e) => setFiltroUbicacion(e.target.value)}>
                  <option value="Todas">Todas las ubicaciones</option>
                  {ubicacionesUnicas.map(ubi => ubi && <option key={ubi} value={ubi}>{ubi}</option>)}
                </select>

                <select className="border rounded-lg p-2 w-full bg-white text-sm" value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}>
                  <option value="Todos">Todos los proveedores</option>
                  {proveedoresUnicos.map(prov => prov && <option key={prov} value={prov}>{prov}</option>)}
                </select>

                <select className="border rounded-lg p-2 w-full bg-white text-sm" value={filtroEstadoStock} onChange={(e) => setFiltroEstadoStock(e.target.value)}>
                  <option value="Todos">Todos los estados de stock</option>
                  <option value="Normal">Normal</option>
                  <option value="Stock Bajo">Stock Bajo</option>
                  <option value="Crítico">Crítico</option>
                </select>

                <select className="border rounded-lg p-2 w-full bg-white text-sm" value={filtroEstadoMaterial} onChange={(e) => setFiltroEstadoMaterial(e.target.value)}>
                  <option value="Todos">Activos e Inactivos</option>
                  <option value="Activo">Solo Activos</option>
                  <option value="Inactivo">Solo Inactivos</option>
                </select>

              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-grow min-h-0 overflow-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 sticky top-0 z-10">
            {/* --- ✅ INICIO DE LA CORRECCIÓN: Se usa el componente SortIcon --- */}
            <tr>
              <th className="px-6 py-3 text-left font-medium cursor-pointer" onClick={() => requestSort('nombre')}>
                <div className="flex items-center gap-1">Producto <SortIcon columnKey="nombre" /></div>
              </th>
              <th className="px-6 py-3 text-center font-medium cursor-pointer" onClick={() => requestSort('tipoCategoria')}>
                <div className="flex items-center justify-center gap-1">Categoría <SortIcon columnKey="tipoCategoria" /></div>
              </th>
              <th className="px-6 py-3 text-left font-medium cursor-pointer" onClick={() => requestSort('cantidad')}>
                <div className="flex items-center gap-1">Cantidad <SortIcon columnKey="cantidad" /></div>
              </th>
              <th className="px-6 py-3 text-left font-medium cursor-pointer" onClick={() => requestSort('ubicacion')}>
                <div className="flex items-center gap-1">Ubicación <SortIcon columnKey="ubicacion" /></div>
              </th>
              <th className="px-6 py-3 text-left font-medium cursor-pointer" onClick={() => requestSort('precio')}>
                <div className="flex items-center gap-1">Valor Unit. <SortIcon columnKey="precio" /></div>
              </th>
              <th className="px-6 py-3 text-left font-medium">Stock</th>
              <th className="px-6 py-3 text-center font-medium">Estado</th>
              <th className="px-6 py-3 text-center font-medium">Acciones</th>
            </tr>
            {/* --- ✅ FIN DE LA CORRECCIÓN --- */}
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentMateriales.map((mat) => {
              const status = getStatusInfo(mat.cantidad);
              const textoContenido = formatarContenido(mat.pesoPorUnidad, mat.medidasDeContenido);

              return (
                <tr key={mat.id} className={`hover:bg-gray-50 ${!mat.estado ? 'bg-red-50 text-red-400' : ''}`}>
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
                  <td className="px-6 py-4">
                    <div className="text-xs font-semibold flex flex-col items-center text-center gap-1">
                      <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        {mat.tipoCategoria}
                      </span>
                      <span className="text-gray-600">{mat.tipoMaterial}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-semibold text-center text-gray-800">{mat.cantidad} {mat.tipoEmpaque}</div>
                    {textoContenido && (
                      <div className="text-center text-xs text-gray-500">{textoContenido}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">{mat.ubicacion}</td>
                  <td className="px-6 py-4">${Number(mat.precio).toLocaleString('es-CO')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center"> {/* Asegura alineación vertical */}
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${status.bg} ${status.text_color}`}>
                        {status.text}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <label className="flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={mat.estado} onChange={() => handleToggleEstado(mat)} />
                        <div className={`block w-10 h-6 rounded-full ${mat.estado ? 'bg-green-400' : 'bg-red-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${mat.estado ? 'transform translate-x-full' : ''}`}></div>
                      </div>
                    </label>
                  </td>
                  <td className="px-6 py-4">
                    {/* --- ✅ 4. MODIFICACIÓN EN ACCIONES --- */}
                    <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openModal(mat)} className="p-1.5 text-gray-500 hover:text-blue-600" title="Editar">
                        <Edit size={16} />
                      </button>
                      
                      {/* Esta es la nueva opción que pediste */}
                      {mat.estado && mat.cantidad <= 10 && (
                        <button 
                          onClick={() => navigate(`/stock/${mat.id}`)} 
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-full animate-pulse"
                          title="Stock Crítico - Ver Detalles"
                        >
                          <AlertTriangle size={16} />
                        </button>
                      )}
                    </div>
                    {/* --- FIN DE LA MODIFICACIÓN --- */}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
        <span className="text-sm text-gray-600">
          Mostrando {Math.min(indexOfLastItem, materialesFiltrados.length)} de {materialesFiltrados.length} materiales
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingMaterial ? 'Editar Material' : 'Registrar Nuevo Material'}>
        <MaterialForm initialData={formInitialData} onSave={handleSave} onCancel={closeModal} />
      </Modal>
    </div>
  );
}

