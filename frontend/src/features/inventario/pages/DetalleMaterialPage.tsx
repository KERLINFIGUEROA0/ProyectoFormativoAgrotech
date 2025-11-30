import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Edit, Plus, Minus, Settings, AlertTriangle, Package, Archive } from 'lucide-react';
// --- ✅ 1. Importamos la API y las interfaces ---
import { obtenerMaterialPorId, actualizarMaterial, subirImagenMaterial, listarMovimientosPorMaterial } from '../api/inventarioApi';
import type { Material, MaterialData, MovimientoData } from '../interfaces/inventario';
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from '@heroui/react';
import MaterialForm from '../components/MaterialForm';

const API_URL = import.meta.env.VITE_BACKEND_URL;

// --- Componente de Tarjeta de Información (Sin cambios) ---
const InfoItem = ({ label, value }: { label: string, value: string | number | null }) => (
  <div>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="font-semibold text-gray-800">{value || 'N/A'}</p>
  </div>
);

// --- Función para formatear el contenido (Sin cambios) ---
const formatarContenido = (peso: number | string | null, tipoMedida: string | null | undefined): string | null => {
  const pesoNumerico = Number(peso);
  if (!pesoNumerico || pesoNumerico <= 0) return null;

  const esLiquido = tipoMedida === 'Litro' || tipoMedida === 'Mililitro';

  if (pesoNumerico < 1) {
    const valorPequeño = Number((pesoNumerico * 1000).toFixed(1));
    return esLiquido ? `${valorPequeño} ml` : `${valorPequeño} g`;
  }

  const valorGrande = Number(pesoNumerico.toFixed(1));
  return esLiquido ? `${valorGrande} L` : `${valorGrande} kg`;
}

// --- ✅ 2. Componente de Barra de Stock (Mejorado) ---
interface StockBarProps {
  label: string;
  valorActual: number;
  valorMinimo: number;
  valorObjetivo: number;
  unidad: string;
}

const StockBar = ({ label, valorActual, valorMinimo, valorObjetivo, unidad }: StockBarProps) => {
  const stockPercentage = Math.min((valorActual / valorObjetivo) * 100, 100);
  
  let statusColor = "bg-green-600";
  let statusLabel = "Stock Estable";
  let statusIconColor = "text-green-700";

  if (valorActual <= valorMinimo) {
    statusColor = "bg-red-600";
    statusLabel = "Crítico";
    statusIconColor = "text-red-700";
  } else if (valorActual <= valorMinimo * 1.5) {
    statusColor = "bg-yellow-500";
    statusLabel = "Stock Bajo";
    statusIconColor = "text-yellow-700";
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-md h-full flex flex-col">
      <h3 className="font-semibold text-gray-700 mb-2">{label}</h3>
      <div className="flex justify-between items-baseline mb-1">
        <p className="text-2xl font-bold text-gray-800">
          {valorActual.toLocaleString('es-CO')}
          <span className="text-base text-gray-500"> / {valorObjetivo.toLocaleString('es-CO')} {unidad}</span>
        </p>
        <span className={`text-xs font-semibold ${statusIconColor} flex items-center gap-1`}>
          {statusLabel !== "Stock Estable" && <AlertTriangle size={12} />}
          {statusLabel}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`${statusColor} h-2.5 rounded-full`} style={{ width: `${stockPercentage}%` }}></div>
      </div>
      <p className="text-xs text-gray-500 mt-1.5">Mínimo: {valorMinimo.toLocaleString('es-CO')} {unidad}</p>
    </div>
  );
};


export default function DetalleMaterialPage() {
  const { materialId } = useParams<{ materialId: string }>();
  const [material, setMaterial] = useState<Material | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- ✅ 3. Cargar Material Y Movimientos ---
  useEffect(() => {
    if (!materialId) return;
    const id = parseInt(materialId);
    setLoading(true);

    Promise.all([
      obtenerMaterialPorId(id),
      listarMovimientosPorMaterial(id)
    ])
    .then(([resMaterial, resMovimientos]) => {
      setMaterial(resMaterial.data);
      setMovimientos(resMovimientos.data || []);
    })
    .catch(() => toast.error("No se pudo cargar el detalle del material."))
    .finally(() => setLoading(false));

  }, [materialId]);

  const handleSave = async (data: MaterialData) => {
    const { imageFile, ...materialData } = data;
    const toastId = toast.loading("Actualizando material...");

    try {
      const res = await actualizarMaterial(material!.id, materialData);
      const updatedMaterial = res.data;

      if (imageFile) {
        await subirImagenMaterial(updatedMaterial.id, imageFile);
        toast.info("Imagen subida correctamente.");
      }

      toast.success("Material actualizado con éxito.", { id: toastId });
      setMaterial(updatedMaterial);
      setIsEditModalOpen(false);
    } catch (error: any) {
      const errorMessage = Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error.response?.data?.message || "No se pudo actualizar el material.";
      toast.error(errorMessage, { id: toastId });
    }
  };

  if (loading) return <div className="text-center p-8">Cargando...</div>;
  if (!material) return <div className="text-center p-8">Material no encontrado.</div>;

  // --- ✅ 4. Lógica de Stock (Mejorada) ---
  const esConsumible = material.tipoConsumo === 'consumible';
  const stockMinimoPaquetes = 10; // Valor de ejemplo para mínimo
  const stockObjetivoPaquetes = 50; // Valor de ejemplo para "lleno"

  const totalContenido = material.pesoPorUnidad ? material.cantidad * material.pesoPorUnidad : null;
  const stockMinimoContenido = material.pesoPorUnidad ? stockMinimoPaquetes * material.pesoPorUnidad : null;
  const stockObjetivoContenido = material.pesoPorUnidad ? stockObjetivoPaquetes * material.pesoPorUnidad : null;

  // Para consumibles, calcular contenido disponible real
  let contenidoDisponible = null;
  if (esConsumible && material.cantidadPorUnidad) {
    const restante = material.cantidadRestanteEnUnidadActual ?? material.cantidadPorUnidad;
    contenidoDisponible = (material.cantidad - 1) * material.cantidadPorUnidad + restante;
  }

  const formInitialData = material ? {
    ...material,
    pesoPorUnidad: material.pesoPorUnidad === null ? undefined : material.pesoPorUnidad,
  } : {};

  return (
    <div className="p-2 sm:p-6 bg-gray-50 min-h-full space-y-6">
      <Link to="/stock" className="flex items-center gap-2 text-green-600 hover:underline font-semibold">
        <ArrowLeft size={18} />
        Volver a Inventario
      </Link>

      {/* Encabezado (Sin cambios) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{material.nombre}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">SKU: MAT-{String(material.id).padStart(3, '0')}</span>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">{material.tipoMaterial}</span>
          </div>
        </div>
        <Button onClick={() => setIsEditModalOpen(true)} color="success" startContent={<Edit size={16} />}>
          Editar Producto
        </Button>
      </div>

      {/* Cuadrícula de Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda (Sin cambios) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-md text-center">
            <img
              src={material.img ? `${API_URL}/uploads/${material.img}` : 'https://via.placeholder.com/300'}
              alt={material.nombre}
              className="w-full h-56 object-cover rounded-lg mb-4"
            />
            <div className="flex justify-center items-center gap-2">
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">{material.tipoMaterial}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${material.cantidad > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {material.cantidad > 0 ? 'Activo' : 'Agotado'}
              </span>
            </div>
          </div>
          {/* --- ✅ Botones de Movimiento Deshabilitados --- */}
          <div className="bg-white p-4 rounded-xl shadow-md space-y-3">
            <h3 className="font-semibold text-gray-700">Registrar Movimiento</h3>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg opacity-50 cursor-not-allowed" disabled><Plus size={16} /> Entrada de Inventario</button>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg opacity-50 cursor-not-allowed" disabled><Minus size={16} /> Salida de Inventario</button>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg opacity-50 cursor-not-allowed" disabled><Settings size={16} /> Ajuste de Inventario</button>
          </div>
        </div>

        {/* Columna Derecha (Modificada) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="font-semibold text-gray-700 mb-4">Detalles</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoItem label="Descripción" value={material.descripcion} />
              <InfoItem label="Proveedor" value={material.proveedor} />
              <InfoItem label="Ubicación" value={material.ubicacion} />
              <InfoItem label="Costo por Paquete" value={`$${Number(material.precio).toLocaleString('es-CO')}`} />
              <InfoItem label="Fecha de Caducidad" value={material.fechaVencimiento ? new Date(material.fechaVencimiento).toLocaleDateString('es-ES') : null} />
              <InfoItem label="Contenido/Paquete" value={formatarContenido(material.pesoPorUnidad, material.medidasDeContenido)} />
              {material.tipoConsumo === 'no_consumible' && material.usosTotales && (
                <InfoItem label="Usos" value={`${material.usosActuales || 0} / ${material.usosTotales}`} />
              )}
            </div>
          </div>
          
          {/* --- ✅ 5. SECCIÓN DE STOCK (Rediseñada) --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StockBar
              label="Stock por Paquetes"
              valorActual={material.cantidad}
              valorMinimo={stockMinimoPaquetes}
              valorObjetivo={stockObjetivoPaquetes}
              unidad={material.tipoEmpaque || 'Paquetes'}
            />

            {esConsumible ? (
              contenidoDisponible !== null && (
                <StockBar
                  label="Contenido Disponible"
                  valorActual={contenidoDisponible}
                  valorMinimo={stockMinimoPaquetes * (material.cantidadPorUnidad || 1)}
                  valorObjetivo={stockObjetivoPaquetes * (material.cantidadPorUnidad || 1)}
                  unidad={material.medidasDeContenido || 'unidades'}
                />
              )
            ) : (
              totalContenido !== null && stockMinimoContenido !== null && stockObjetivoContenido !== null && (
                <StockBar
                  label="Stock por Contenido Total"
                  valorActual={Number(totalContenido.toFixed(1))}
                  valorMinimo={Number(stockMinimoContenido.toFixed(1))}
                  valorObjetivo={Number(stockObjetivoContenido.toFixed(1))}
                  unidad={material.medidasDeContenido || 'unidades'}
                />
              )
            )}
          </div>

          {/* --- ✅ Sección de Movimientos --- */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <h3 className="font-semibold text-gray-700 mb-2">Movimientos Recientes</h3>
            <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
              {movimientos.length > 0 ? movimientos.slice(0, 10).map(mov => (
                <div key={mov.id} className={`flex justify-between items-center p-2 rounded-md ${mov.tipo === 'ingreso' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p>
                    {mov.tipo === 'ingreso' ? 'Entrada' : 'Salida'}
                    <span className="text-xs text-gray-500 ml-2">({new Date(mov.fecha).toLocaleDateString('es-ES')})</span>
                  </p>
                  <p className={`font-bold ${mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    {mov.tipo === 'ingreso' ? '+' : '-'}{mov.cantidad}
                  </p>
                </div>
              )) : (
                <p className="text-center text-gray-500 py-4">No hay movimientos registrados.</p>
              )}
            </div>
          </div>

        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} size="4xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Editar Material</ModalHeader>
          <ModalBody>
            <MaterialForm
              initialData={formInitialData}
              onSave={handleSave}
              onCancel={() => setIsEditModalOpen(false)}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}

