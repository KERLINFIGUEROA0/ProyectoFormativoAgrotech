import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Edit, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Search, PlusCircle } from 'lucide-react';

import { listarMateriales, crearMaterial, actualizarMaterial, subirImagenMaterial, desactivarMaterial, reactivarMaterial, actualizarStock } from '../api/inventarioApi';
import MaterialForm from '../components/MaterialForm';
import { type Material, type MaterialData } from '../interfaces/inventario';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input, Select, SelectItem, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Switch, Pagination } from '@heroui/react';

const API_URL = import.meta.env.VITE_BACKEND_URL;

// --- ✅ CORRECCIÓN 1: Arrays de unidades para detección automática ---
const UNIDADES_LIQUIDAS = ['L', 'l', 'ml', 'mL', 'Litro', 'Mililitro', 'gal', 'oz', 'cm3', 'cm³'];

// --- ✅ CORRECCIÓN 2: Recibimos 'unidadMedida' como parámetro ---
const renderCantidadAmigable = (
  cantidadTotal: number | null | undefined, 
  pesoPorUnidad: number | null | undefined, 
  tipoEmpaque: string,
  unidadMedida: string | null | undefined // Nuevo parámetro
) => {
  // Caso 1: Herramientas o items sin peso definido
  if (!pesoPorUnidad || pesoPorUnidad <= 0) {
    return (
      <div className="font-semibold text-center text-gray-800">
        {cantidadTotal || 0} {tipoEmpaque}
      </div>
    );
  }

  // Caso 2: Consumibles (Abonos, Químicos)
  const cantidad = cantidadTotal || 0;
  const paquetesEstimados = cantidad / pesoPorUnidad;
  
  // Calculamos el total (asumiendo que la DB guarda en gramos/mililitros)
  const totalEnUnidadMayor = cantidad / 1000;

  const paquetesVisual = Number.isInteger(paquetesEstimados)
      ? paquetesEstimados
      : paquetesEstimados.toFixed(1);

  const totalVisual = Number.isInteger(totalEnUnidadMayor)
      ? totalEnUnidadMayor
      : totalEnUnidadMayor.toFixed(2);

  // --- ✅ Lógica dinámica para detectar si es líquido ---
  const esLiquido = unidadMedida && UNIDADES_LIQUIDAS.includes(unidadMedida);

  return (
    <div className="flex flex-col items-center">
      <div className="font-bold text-gray-800 text-base">
        {paquetesVisual} {tipoEmpaque}s
      </div>
      <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full mt-1">
        {/* Mostrar total disponible en kg */}
        Total: {esLiquido ? (Number(totalVisual) * 1).toFixed(2) : totalVisual} kg
      </div>
    </div>
  );
};

const getStatusInfo = (cantidad: number | null | undefined, pesoPorUnidad: number | null | undefined) => {
  const cantidadReal = cantidad || 0;
  let cantidadParaEvaluar = cantidadReal;

  if (pesoPorUnidad && pesoPorUnidad > 0) {
    cantidadParaEvaluar = cantidadReal / pesoPorUnidad;
  }

  if (cantidadParaEvaluar <= 5) return { text: 'Crítico', bg: 'bg-red-100', text_color: 'text-red-800' };
  if (cantidadParaEvaluar <= 15) return { text: 'Stock Bajo', bg: 'bg-yellow-100', text_color: 'text-yellow-800' };
  return { text: 'Normal', bg: 'bg-green-100', text_color: 'text-green-800' };
};

// --- ✅ CORRECCIÓN 3: Mejoramos la detección en el formateo ---
const formatarContenido = (peso: number | string | null | undefined, tipoMedida: string | number | null | undefined): string | null => {
  const pesoNumerico = Number(peso);
  if (!pesoNumerico || pesoNumerico <= 0) return null;

  // Verificamos si la unidad está en la lista de líquidos
  const esLiquido = typeof tipoMedida === 'string' && UNIDADES_LIQUIDAS.includes(tipoMedida);

  if (esLiquido) {
    // Para líquidos, asumimos que pesoPorUnidad está en ml
    if (pesoNumerico >= 1000) {
      // Si >= 1000 ml, mostrar en L
      const valorEnLitros = Number((pesoNumerico / 1000).toFixed(2));
      return `${valorEnLitros} L`;
    } else {
      // Si < 1000 ml, mostrar en ml
      const valorEnMl = Number(pesoNumerico.toFixed(3));
      return `${valorEnMl} ml`;
    }
  } else {
    // Para sólidos, asumimos que pesoPorUnidad está en g
    if (pesoNumerico >= 1000) {
      // Si >= 1000 g, mostrar en kg
      const valorEnKg = Number((pesoNumerico / 1000).toFixed(2));
      return `${valorEnKg} kg`;
    } else {
      // Si < 1000 g, mostrar en g
      const valorEnG = Number(pesoNumerico.toFixed(3));
      return `${valorEnG} g`;
    }
  }
}

export default function GestionInventarioPage() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [materialesFiltrados, setMaterialesFiltrados] = useState<Material[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedMaterialForStock, setSelectedMaterialForStock] = useState<Material | null>(null);
  const [cantidadEmpaquesStock, setCantidadEmpaquesStock] = useState('');
  const navigate = useNavigate();

  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroTipoCategoria, setFiltroTipoCategoria] = useState<string | null>(null);
  const [filtroUbicacion, setFiltroUbicacion] = useState<string | null>(null);
  const [filtroEstadoStock, setFiltroEstadoStock] = useState<'Todos' | 'Normal' | 'Stock Bajo' | 'Crítico'>('Todos');
  const [filtroProveedor, setFiltroProveedor] = useState<string | null>(null);
  const [filtroEstadoMaterial, setFiltroEstadoMaterial] = useState<'Todos' | 'Activo' | 'Inactivo'>('Todos');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); 

  const [sortConfig, setSortConfig] = useState<{ key: keyof Material | null; direction: 'ascending' | 'descending' }>({ key: 'nombre', direction: 'ascending' });

  const fetchData = async () => {
    try {
      const resMateriales = await listarMateriales();
      const materials = resMateriales.data || [];
      setMateriales(materials);
      applyFilter(materials);
    } catch (error) {
      toast.error("Error al cargar los materiales.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    const delayDebounceFn = setTimeout(() => {
      applyFilter(materiales);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [filtroBusqueda, filtroTipoCategoria, filtroUbicacion, filtroEstadoStock, filtroProveedor, filtroEstadoMaterial, sortConfig, materiales]);


  const openModal = (material: Material | null = null) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMaterial(null);
  };

  const openStockModal = (material: Material) => {
    setSelectedMaterialForStock(material);
    setCantidadEmpaquesStock('');
    setIsStockModalOpen(true);
  };

  const closeStockModal = () => {
    setIsStockModalOpen(false);
    setSelectedMaterialForStock(null);
    setCantidadEmpaquesStock('');
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

  const handleUpdateStock = async () => {
    if (!selectedMaterialForStock || !cantidadEmpaquesStock) return;

    const cantidad = parseInt(cantidadEmpaquesStock);
    if (cantidad <= 0) {
      toast.error("La cantidad debe ser mayor a 0.");
      return;
    }

    const toastId = toast.loading("Actualizando stock...");

    try {
      await actualizarStock(selectedMaterialForStock.id, cantidad);
      toast.success(`Stock actualizado. Se agregaron ${cantidad} empaques.`, { id: toastId });
      fetchData();
      closeStockModal();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "No se pudo actualizar el stock.";
      toast.error(errorMessage, { id: toastId });
    }
  };

  const itemsCriticos = useMemo(() => {
    return materiales.filter(mat => {
      if (!mat.estado) return false;
      const cantidadParaEvaluar = mat.pesoPorUnidad && mat.pesoPorUnidad > 0
        ? mat.cantidad / mat.pesoPorUnidad
        : mat.cantidad;
      return cantidadParaEvaluar <= 15; // Incluye tanto stock crítico (<=5) como bajo stock (<=15)
    });
  }, [materiales]);

  const applyFilter = (materialsToFilter: Material[]) => {
    let filtered = materialsToFilter;
    const newActiveFilters: string[] = [];

    if (filtroBusqueda.trim() !== "") {
      const lowercasedTerm = filtroBusqueda.toLowerCase();
      filtered = filtered.filter((mat) => {
        const nombre = mat.nombre.toLowerCase();
        const descripcion = mat.descripcion?.toLowerCase() || "";
        const categoria = mat.tipoCategoria?.toLowerCase() || "";
        const ubicacion = mat.ubicacion?.toLowerCase() || "";
        const proveedor = mat.proveedor?.toLowerCase() || "";
        return (
          nombre.includes(lowercasedTerm) ||
          descripcion.includes(lowercasedTerm) ||
          categoria.includes(lowercasedTerm) ||
          ubicacion.includes(lowercasedTerm) ||
          proveedor.includes(lowercasedTerm)
        );
      });
      newActiveFilters.push(`Búsqueda: "${filtroBusqueda}"`);
    }

    if (filtroTipoCategoria !== null) {
      filtered = filtered.filter((mat) => mat.tipoCategoria === filtroTipoCategoria);
      newActiveFilters.push(`Categoría: ${filtroTipoCategoria}`);
    }

    if (filtroUbicacion !== null) {
      filtered = filtered.filter((mat) => mat.ubicacion === filtroUbicacion);
      newActiveFilters.push(`Ubicación: ${filtroUbicacion}`);
    }

    if (filtroProveedor !== null) {
      filtered = filtered.filter((mat) => mat.proveedor === filtroProveedor);
      newActiveFilters.push(`Proveedor: ${filtroProveedor}`);
    }

    if (filtroEstadoStock !== 'Todos') {
      filtered = filtered.filter((mat) => {
        const status = getStatusInfo(mat.cantidad, mat.pesoPorUnidad).text;
        if (filtroEstadoStock === 'Crítico') {
          return status === 'Crítico' || status === 'Stock Bajo';
        }
        return status === filtroEstadoStock;
      });
      newActiveFilters.push(`Stock: ${filtroEstadoStock}`);
    }

    if (filtroEstadoMaterial !== 'Todos') {
      filtered = filtered.filter((mat) =>
        filtroEstadoMaterial === 'Activo' ? mat.estado : !mat.estado
      );
      newActiveFilters.push(`Estado: ${filtroEstadoMaterial}`);
    }

    // Aplicar ordenamiento
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortConfig.key) {
          case 'nombre':
            aValue = a.nombre.toLowerCase();
            bValue = b.nombre.toLowerCase();
            break;
          case 'tipoCategoria':
            aValue = a.tipoCategoria?.toLowerCase() || '';
            bValue = b.tipoCategoria?.toLowerCase() || '';
            break;
          case 'cantidad':
            aValue = a.cantidad;
            bValue = b.cantidad;
            break;
          case 'ubicacion':
            aValue = a.ubicacion?.toLowerCase() || '';
            bValue = b.ubicacion?.toLowerCase() || '';
            break;
          case 'precio':
            aValue = a.precio;
            bValue = b.precio;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    setMaterialesFiltrados(filtered);
    setActiveFilters(newActiveFilters);
  };


  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMateriales = materialesFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(materialesFiltrados.length / itemsPerPage);

  // filter helpers removed — inline actions are used in the UI instead

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

  const SortIcon = ({ columnKey }: { columnKey: keyof Material }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={12} className="text-transparent" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp size={12} className="text-blue-600" />;
    }
    return <ArrowDown size={12} className="text-blue-600" />;
  };

  return (

    <div className="bg-white shadow-xl rounded-xl p-6 w-full flex flex-col h-full">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4 flex-shrink-0">
        <h1 className="text-3xl font-bold text-gray-800">Gestión De Inventario</h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Button onClick={() => openModal()} color="success" startContent={<Plus size={16} />} className="text-white font-bold">
            Añadir Producto
          </Button>
        </div>
      </header>

      {itemsCriticos.length > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 mb-6 bg-red-100 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <h4 className="font-bold text-red-800">Stock Crítico</h4>
              <p className="text-sm text-red-700">
                Tienes {itemsCriticos.length} material(es) con stock crítico o bajo que necesitan atención.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setFiltroEstadoStock(filtroEstadoStock === 'Crítico' ? 'Todos' : 'Crítico')}
            className="bg-green-600 text-white font-bold hover:bg-green-700 flex-shrink-0"
          >
            {filtroEstadoStock === 'Crítico' ? 'Ver Todos' : 'Ver Stock Bajo'}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-3">
        {/* Filtros principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <Input
            type="text"
            placeholder="Buscar..."
            startContent={<Search className="text-gray-400 h-3 w-3" />}
            className="w-full"
            size="sm"
            value={filtroBusqueda}
            onChange={(e) => setFiltroBusqueda(e.target.value)}
          />

          <Select
            placeholder="Categorías"
            className="w-full"
            size="sm"
            selectedKeys={filtroTipoCategoria ? new Set([filtroTipoCategoria]) : new Set()}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0];
              setFiltroTipoCategoria(selected as string || null);
            }}
          >
            {tiposCategoriaUnicos.filter(cat => cat).map(cat => <SelectItem key={cat}>{cat}</SelectItem>)}
          </Select>

          <Select
            placeholder="Ubicaciones"
            className="w-full"
            size="sm"
            selectedKeys={filtroUbicacion ? new Set([filtroUbicacion]) : new Set()}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0];
              setFiltroUbicacion(selected as string || null);
            }}
          >
            {ubicacionesUnicas.filter(ubi => ubi).map(ubi => <SelectItem key={ubi}>{ubi}</SelectItem>)}
          </Select>

          <Select
            placeholder="Proveedores"
            className="w-full"
            size="sm"
            selectedKeys={filtroProveedor ? new Set([filtroProveedor]) : new Set()}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0];
              setFiltroProveedor(selected as string || null);
            }}
          >
            {proveedoresUnicos.filter(prov => prov).map(prov => <SelectItem key={prov}>{prov}</SelectItem>)}
          </Select>

          <Select
            placeholder="Estado"
            className="w-full"
            size="sm"
            selectedKeys={new Set([filtroEstadoMaterial])}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as "Todos" | "Activo" | "Inactivo";
              setFiltroEstadoMaterial(selected);
            }}
          >
            <SelectItem key="Estado">Todos</SelectItem>
            <SelectItem key="Activo">Activos</SelectItem>
            <SelectItem key="Inactivo">Inactivos</SelectItem>
          </Select>

          <Select
            placeholder="Stock"
            className="w-full"
            size="sm"
            selectedKeys={new Set([filtroEstadoStock])}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as "Todos" | "Normal" | "Stock Bajo" | "Crítico";
              setFiltroEstadoStock(selected);
            }}
          >
            <SelectItem key="Todos">Stock</SelectItem>
            <SelectItem key="Normal">Normal</SelectItem>
            <SelectItem key="Stock Bajo">Bajo</SelectItem>
            <SelectItem key="Crítico">Crítico</SelectItem>
          </Select>
        </div>

        {/* Chips de filtros activos */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-gray-600 font-medium">
              Filtros:
            </span>
            {activeFilters.map((filter, index) => (
              <Chip
                key={index}
                color="primary"
                variant="flat"
                size="sm"
                onClose={() => {
                  if (filter.includes("Búsqueda:")) setFiltroBusqueda("");
                  else if (filter.includes("Categoría:")) setFiltroTipoCategoria(null);
                  else if (filter.includes("Ubicación:")) setFiltroUbicacion(null);
                  else if (filter.includes("Proveedor:")) setFiltroProveedor(null);
                  else if (filter.includes("Stock:")) setFiltroEstadoStock("Todos");
                  else if (filter.includes("Estado:")) setFiltroEstadoMaterial("Todos");
                }}
                className="text-xs px-2 py-1 h-6"
              >
                {filter}
              </Chip>
            ))}
            <Button
              onClick={() => {
                setFiltroBusqueda("");
                setFiltroTipoCategoria(null);
                setFiltroUbicacion(null);
                setFiltroProveedor(null);
                setFiltroEstadoStock("Todos");
                setFiltroEstadoMaterial("Todos");
              }}
              color="default"
              variant="light"
              size="sm"
              className="text-xs h-6 px-2"
            >
              Limpiar
            </Button>
          </div>
        )}
      </div>

      <div className="flex-grow min-h-0 overflow-auto border border-gray-200 rounded-lg">
        <Table aria-label="Tabla de inventario" className="min-h-full">
          <TableHeader>
            <TableColumn className="cursor-pointer" onClick={() => requestSort('nombre')}>
              <div className="flex items-center gap-1">
                Producto <SortIcon columnKey="nombre" />
              </div>
            </TableColumn>
            <TableColumn align="center" className="cursor-pointer" onClick={() => requestSort('tipoCategoria')}>
              <div className="flex items-center justify-center gap-1">
                Categoría <SortIcon columnKey="tipoCategoria" />
              </div>
            </TableColumn>
            <TableColumn className="cursor-pointer" onClick={() => requestSort('cantidad')}>
              <div className="flex items-center gap-1">
                Cantidad <SortIcon columnKey="cantidad" />
              </div>
            </TableColumn>
            <TableColumn className="cursor-pointer" onClick={() => requestSort('ubicacion')}>
              <div className="flex items-center gap-1">
                Ubicación <SortIcon columnKey="ubicacion" />
              </div>
            </TableColumn>
            <TableColumn className="cursor-pointer" onClick={() => requestSort('precio')}>
              <div className="flex items-center gap-1">
                Valor Unit. <SortIcon columnKey="precio" />
              </div>
            </TableColumn>
            <TableColumn>Stock</TableColumn>
            <TableColumn align="center">Estado</TableColumn>
            <TableColumn align="center">Acciones</TableColumn>
          </TableHeader>
          <TableBody>
            {currentMateriales.map((mat) => {
              const status = getStatusInfo(mat.cantidad, mat.pesoPorUnidad);
                          const textoContenido = formatarContenido(mat.pesoPorUnidad, (mat.medidasDeContenido ?? null) as string | number | null);

              return (
                <TableRow key={mat.id || `mat-${Math.random()}`} className={!mat.estado ? 'bg-red-50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        className={`w-10 h-10 object-cover rounded-md ${!mat.estado ? 'filter grayscale' : ''}`}
                        src={mat.img ? `${API_URL}/uploads/${mat.img}` : 'https://via.placeholder.com/40'}
                        alt={mat.nombre}
                      />
                      <div onClick={() => mat.estado && navigate(`/stock/${mat.id}`)} className={mat.estado ? "cursor-pointer" : ""}>
                        <p className={`font-semibold ${mat.estado ? 'text-gray-800' : 'text-red-400'}`}>{mat.nombre}</p>
                        <p className="text-xs text-gray-500">CÓDIGO: MAT-{String(mat.id).padStart(3, '0')}</p>
                        {textoContenido && <p className="text-xs text-gray-400">{textoContenido}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold flex flex-col items-center text-center gap-1">
                      <Chip size="sm" variant="flat" color="primary">
                        {mat.tipoCategoria}
                      </Chip>
                      <span className="text-gray-600">{mat.tipoMaterial}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderCantidadAmigable(mat.cantidad, mat.pesoPorUnidad, mat.tipoEmpaque, mat.medidasDeContenido)}
                  </TableCell>
                  <TableCell>{mat.ubicacion}</TableCell>
                  <TableCell>${Number(mat.precio).toLocaleString('es-CO')}</TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={
                        status.text === 'Crítico' ? 'danger' :
                        status.text === 'Stock Bajo' ? 'warning' : 'success'
                      }
                    >
                      {status.text}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      size="sm"
                      color="success"
                      isSelected={mat.estado}
                      onValueChange={() => handleToggleEstado(mat)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button onClick={() => openModal(mat)} color="primary" variant="light" isIconOnly title="Editar">
                        <Edit size={16} />
                      </Button>

                      {mat.estado && (
                        <Button onClick={() => openStockModal(mat)} color="success" variant="light" isIconOnly title="Actualizar Stock">
                          <PlusCircle size={16} />
                        </Button>
                      )}

                      {mat.estado && mat.cantidad <= 10 && (
                        <Button
                          onClick={() => navigate(`/stock/${mat.id}`)}
                          color="danger"
                          variant="light"
                          isIconOnly
                          className="animate-pulse"
                          title="Stock Crítico - Ver Detalles"
                        >
                          <AlertTriangle size={16} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-200 gap-3 md:gap-4 bg-gray-50/50 px-3 md:px-4 py-2 md:py-3 rounded-lg">
        <div className="text-xs md:text-sm text-gray-600 text-center sm:text-left">
          <span className="font-medium">
            Mostrando {Math.min(indexOfLastItem, materialesFiltrados.length)} de{" "}
            {materialesFiltrados.length} materiales
          </span>
          {activeFilters.length > 0 && (
            <span className="ml-2 text-blue-600 font-medium">
              ({activeFilters.length} filtro
              {activeFilters.length !== 1 ? "s" : ""} activo
              {activeFilters.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>
        {totalPages > 1 && (
          <Pagination
            total={totalPages}
            page={currentPage}
            onChange={setCurrentPage}
            showControls
            showShadow
            color="primary"
            size="sm"
            className="justify-center sm:justify-end"
          />
        )}
      </div>

      <Modal isOpen={isModalOpen} onOpenChange={closeModal} size="4xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            {editingMaterial ? 'Editar Material' : 'Registrar Nuevo Material'}
          </ModalHeader>
          <ModalBody>
            <MaterialForm initialData={formInitialData} onSave={handleSave} onCancel={closeModal} />
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={isStockModalOpen} onOpenChange={closeStockModal}>
        <ModalContent>
          <ModalHeader>
            Actualizar Stock - {selectedMaterialForStock?.nombre}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Agregar {selectedMaterialForStock?.tipoEmpaque || 'unidades'} al stock existente.
                {selectedMaterialForStock?.tipoConsumo === 'consumible' && selectedMaterialForStock?.pesoPorUnidad
                  ? ` Cada ${selectedMaterialForStock.tipoEmpaque} contiene ${selectedMaterialForStock.pesoPorUnidad / 1000} ${selectedMaterialForStock.medidasDeContenido === 'L' || selectedMaterialForStock.medidasDeContenido === 'ml' ? 'L' : 'kg'}.`
                  : ''
                }
              </p>
              <Input
                label={`Cantidad de ${selectedMaterialForStock?.tipoEmpaque || 'unidades'} a agregar`}
                type="number"
                value={cantidadEmpaquesStock}
                onChange={(e) => setCantidadEmpaquesStock(e.target.value)}
                placeholder={`Ej: ${selectedMaterialForStock?.tipoEmpaque === 'Unidad' ? '10' : '40'}`}
                min="1"
                fullWidth
              />
              <div className="flex justify-end gap-3">
                <Button onClick={closeStockModal} variant="light">
                  Cancelar
                </Button>
                <Button onClick={handleUpdateStock} disabled={!cantidadEmpaquesStock || parseInt(cantidadEmpaquesStock) <= 0} className="bg-green-600 text-white font-bold hover:bg-green-700">
                  Actualizar Stock
                </Button>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
