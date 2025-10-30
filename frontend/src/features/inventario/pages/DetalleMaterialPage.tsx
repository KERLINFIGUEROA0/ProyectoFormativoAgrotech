import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Edit, Plus, Minus, Settings } from 'lucide-react';
import { obtenerMaterialPorId } from '../api/inventarioApi';
import type { Material } from '../interfaces/inventario';

const API_URL = import.meta.env.VITE_BACKEND_URL;

// Componentes auxiliares para el layout
const InfoItem = ({ label, value }: { label: string, value: string | number | null }) => (
  <div>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="font-semibold text-gray-800">{value || 'N/A'}</p>
  </div>
);

const StatCard = ({ value, label }: { value: string | number, label: string }) => (
  <div className="bg-gray-50 p-3 rounded-lg text-center">
    <p className="text-2xl font-bold text-green-700">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

export default function DetalleMaterialPage() {
  const { materialId } = useParams<{ materialId: string }>();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!materialId) return;
    const id = parseInt(materialId);
    setLoading(true);
    obtenerMaterialPorId(id)
      .then(res => setMaterial(res.data))
      .catch(() => toast.error("No se pudo cargar el detalle del material."))
      .finally(() => setLoading(false));
  }, [materialId]);

  if (loading) return <div className="text-center p-8">Cargando...</div>;
  if (!material) return <div className="text-center p-8">Material no encontrado.</div>;
  
  const stockMinimo = 50; // Valor de ejemplo
  const stockPercentage = Math.min((material.cantidad / stockMinimo) * 100, 100);

  return (
    <div className="p-2 sm:p-6 bg-gray-50 min-h-full space-y-6">
      <Link to="/stock" className="flex items-center gap-2 text-green-600 hover:underline font-semibold">
        <ArrowLeft size={18} />
        Volver a Inventario
      </Link>
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{material.nombre}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">SKU: MAT-{String(material.id).padStart(3, '0')}</span>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">{material.tipoMaterial}</span>
          </div>
        </div>
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm hover:bg-green-700">
          <Edit size={16}/> Editar Producto
        </button>
      </div>
      
      {/* Cuadrícula de Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda */}
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
          <div className="bg-white p-4 rounded-xl shadow-md space-y-3">
             <h3 className="font-semibold text-gray-700">Registrar Movimiento</h3>
             <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 font-semibold"><Plus size={16}/> Entrada de Inventario</button>
             <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 font-semibold"><Minus size={16}/> Salida de Inventario</button>
             <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-semibold"><Settings size={16}/> Ajuste de Inventario</button>
          </div>
        </div>
        
        {/* Columna Derecha */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="font-semibold text-gray-700 mb-4">Detalles</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoItem label="Descripción" value={material.descripcion}/>
                    <InfoItem label="Proveedor" value={material.proveedor} />
                    <InfoItem label="Ubicación" value={material.ubicacion} />
                    <InfoItem label="Costo por Unidad" value={`$${Number(material.precio).toLocaleString('es-CO')}`} />
                    <InfoItem label="Fecha de Caducidad" value={material.fechaVencimiento ? new Date(material.fechaVencimiento).toLocaleDateString('es-ES') : null} />
                    <InfoItem label="Estado" value={material.cantidad > 0 ? 'Activo' : 'Agotado'} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-xl shadow-md">
                     <h3 className="font-semibold text-gray-700 mb-2">Movimientos Recientes</h3>
                     <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center bg-green-50 p-2 rounded-md">
                            <p>Entrada de Inventario <span className="text-xs text-gray-500">(15 Ene 2024)</span></p>
                            <p className="font-bold text-green-600">+50 unidades</p>
                        </div>
                         <div className="flex justify-between items-center bg-red-50 p-2 rounded-md">
                            <p>Salida <span className="text-xs text-gray-500">(12 Ene 2024)</span></p>
                            <p className="font-bold text-red-600">-25 unidades</p>
                        </div>
                     </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-md">
                     <h3 className="font-semibold text-gray-700 mb-2">Estado de Inventario</h3>
                     <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                            <p className="font-bold text-lg">{material.cantidad}</p>
                            <p className="text-xs text-gray-500">Stock Actual ({material.tipoMedida})</p>
                        </div>
                        <div className="text-right">
                             <p className="font-bold text-lg">{stockMinimo}</p>
                             <p className="text-xs text-gray-500">Stock Mínimo</p>
                        </div>
                     </div>
                     <div className="w-full bg-gray-200 rounded-full h-2.5">
                         <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${stockPercentage}%` }}></div>
                     </div>
                     <p className="text-xs text-center mt-1 font-semibold text-green-700">Stock Estable</p>
                     <div className="grid grid-cols-2 gap-2 mt-3">
                        <StatCard value={material.pesoPorUnidad ? (material.cantidad * material.pesoPorUnidad).toLocaleString('es-CO') : 'N/A'} label="kg Totales" />
                        <StatCard value="28" label="Días de Stock" />
                     </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}