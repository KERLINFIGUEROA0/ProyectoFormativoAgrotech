import { useState, useEffect, type ReactElement, type ChangeEvent } from 'react';
import { Button } from "@heroui/react";
import type { TransaccionData } from '../interfaces/finanzas';
import { toast } from 'sonner';
import { BookText, Hash, DollarSign, Calendar, Archive } from 'lucide-react';
import { getAvailableForSale } from '../../cultivos/api/produccionApi';
import type { Produccion } from '../../cultivos/interfaces/cultivos';

function FormInput({ icon: Icon, label, ...props }: { icon: React.ComponentType<{ size: number, className: string }>, label: string, [key: string]: any }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
        <Icon size={16} className="text-green-600" />
        {label}
      </label>
      <input {...props} className="w-full border-2 border-gray-200 rounded-lg p-2 text-sm focus:border-green-500 focus:ring-0 outline-none transition" />
    </div>
  );
}

interface TransaccionFormProps {
  onSave: (data: TransaccionData) => void;
  onCancel: () => void;
}

export default function TransaccionForm({ onSave, onCancel }: TransaccionFormProps): ReactElement {
   const [formData, setFormData] = useState<Partial<TransaccionData>>({
     fecha: new Date().toISOString().split('T')[0],
     tipo: 'ingreso', // Valor por defecto
   });
   const [productions, setProductions] = useState<Produccion[]>([]);
   const [selectedProduction, setSelectedProduction] = useState<Produccion | null>(null);
   const [unidad, setUnidad] = useState<'kg' | 'lb'>('kg');

  useEffect(() => {
    const fetchAvailableProductions = async () => {
      try {
        // Intentar usar el endpoint específico, si falla usar alternativa
        const response = await getAvailableForSale();
        setProductions(response.data);
      } catch (error) {
        console.warn("Endpoint /producciones/available-for-sale no disponible, usando alternativa");
        try {
          // Usar ruta directa para obtener todas las producciones
          const produccionesResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/producciones`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (produccionesResponse.ok) {
            const prodData = await produccionesResponse.json();
            const availableProductions = (prodData.data || []).filter((p: Produccion) => p.cantidad > 0);
            setProductions(availableProductions);
          } else {
            throw new Error("No se pudieron cargar las producciones");
          }
        } catch (fallbackError) {
          console.error("Error en fallback:", fallbackError);
          toast.error("Error al cargar producciones disponibles");
        }
      }
    };

    fetchAvailableProductions();
  }, []);

  const handleSubmit = () => {
    if (!formData.cantidad || !formData.monto || !formData.produccionId) {
      toast.error("La cantidad, el precio unitario y el ID de producción son requeridos.");
      return;
    }

    // Convertir cantidad a kg si está en libras
    const cantidadEnKg = unidad === 'lb' ? formData.cantidad / 2.20462 : formData.cantidad;

    // Validar que no se venda más de lo disponible
    if (selectedProduction && cantidadEnKg > selectedProduction.cantidad) {
      toast.error(`No puedes vender más de ${selectedProduction.cantidad} ${unidad} disponibles.`);
      return;
    }

    onSave({ ...formData, cantidad: cantidadEnKg } as TransaccionData);
  };

  return (
    <div className="p-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Agregar Nueva Transacción</h2>
        <p className="text-gray-500">Ingresa la información de la transacción</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="md:col-span-2">
          <FormInput 
            icon={BookText}
            label="Descripción de la Venta"
            name="descripcion"
            value={formData.descripcion || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
            placeholder="Ej: Venta de aguacates a supermercado local"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
            <Hash size={16} className="text-green-600" />
            Cantidad Vendida
          </label>
          <div className="flex gap-2">
            <input
              name="cantidad"
              type="number"
              value={formData.cantidad || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, cantidad: Number(e.target.value) }))}
              placeholder="Ej: 150"
              className="flex-1 border-2 border-gray-200 rounded-lg p-2 text-sm focus:border-green-500 focus:ring-0 outline-none transition"
            />
            <select
              value={unidad}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setUnidad(e.target.value as 'kg' | 'lb')}
              className="border-2 border-gray-200 rounded-lg p-2 text-sm focus:border-green-500 focus:ring-0 outline-none transition"
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
        </div>
        <FormInput 
          icon={DollarSign}
          label="Precio Unitario"
          name="monto"
          type="number"
          value={formData.monto || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, monto: Number(e.target.value) }))}
          placeholder="Precio por unidad"
        />
        <FormInput 
          icon={Calendar}
          label="Fecha de Venta"
          name="fecha"
          type="date"
          value={formData.fecha || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
        />
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
            <Archive size={16} className="text-green-600" />
            Producción
          </label>
          <select
            name="produccionId"
            value={formData.produccionId || ''}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              const prodId = Number(e.target.value);
              const prod = productions.find(p => p.id === prodId);
              setSelectedProduction(prod || null);
              setFormData(prev => ({ ...prev, produccionId: prodId }));
            }}
            className="w-full border-2 border-gray-200 rounded-lg p-2 text-sm focus:border-green-500 focus:ring-0 outline-none transition"
          >
            <option value="">Seleccione una producción</option>
            {productions.map(prod => (
              <option key={prod.id} value={prod.id}>
                {`${prod.cultivo.nombre} - Disponible: ${prod.cantidad} ${unidad}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
            <Archive size={16} className="text-green-600" />
            Tipo de Transacción
          </label>
          <select
            name="tipo"
            value={formData.tipo || 'ingreso'}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
            className="w-full border-2 border-gray-200 rounded-lg p-2 text-sm focus:border-green-500 focus:ring-0 outline-none transition"
          >
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </select>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button onClick={onCancel} className="bg-red-100 text-red-700 border-2 border-red-200 hover:bg-red-200 w-40">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} className="bg-green-600 text-white hover:bg-green-700 w-40">
          Guardar Transacción
        </Button>
      </div>
    </div>
  );
}