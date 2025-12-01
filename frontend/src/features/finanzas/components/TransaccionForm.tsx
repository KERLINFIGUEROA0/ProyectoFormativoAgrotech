import { useState, useEffect, type ReactElement, type ChangeEvent } from 'react';
import { Button, Select, SelectItem } from "@heroui/react";
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

    // Validar que la cantidad no sea negativa o cero
    if (formData.cantidad <= 0) {
      toast.error("La cantidad debe ser un número positivo mayor a cero.");
      return;
    }

    // Validar que el precio no sea negativo o cero
    if (formData.monto <= 0) {
      toast.error("El precio unitario debe ser un número positivo mayor a cero.");
      return;
    }

    // Convertir cantidad a kg si está en libras
    // Validar que no se venda más de lo disponible
    if (selectedProduction && formData.cantidad > selectedProduction.cantidad) {
      toast.error(`No puedes vender más de ${selectedProduction.cantidad} kg disponibles.`);
      return;
    }

    onSave({ ...formData } as TransaccionData);
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
            Cantidad Vendida (kg)
          </label>
          <div className="flex gap-2">
            <input
              name="cantidad"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.cantidad || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const value = Number(e.target.value);
                if (value >= 0) {
                  setFormData(prev => ({ ...prev, cantidad: value }));
                }
              }}
              placeholder="Ej: 150"
              className="w-full border-2 border-gray-200 rounded-lg p-2 text-sm focus:border-green-500 focus:ring-0 outline-none transition"
            />
          </div>
        </div>
          <FormInput 
          icon={DollarSign}
          label="Precio Unitario"
          name="monto"
          type="number"
          min="0.01"
          step="0.01"
          value={formData.monto || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const value = Number(e.target.value);
            if (value >= 0) {
              setFormData(prev => ({ ...prev, monto: value }));
            }
          }}
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
          <Select
            name="produccionId"
            selectedKeys={formData.produccionId ? [formData.produccionId.toString()] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0];
              const prodId = Number(selected);
              const prod = productions.find(p => p.id === prodId);
              setSelectedProduction(prod || null);
              setFormData(prev => ({ ...prev, produccionId: prodId }));
            }}
            placeholder="Seleccione una producción"
          >
            {productions.map(prod => (
              <SelectItem key={prod.id.toString()}>
                {`${prod.cultivo.nombre} - Disponible: ${prod.cantidad} kg`}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
            <Archive size={16} className="text-green-600" />
            Tipo de Transacción
          </label>
          <Select
            name="tipo"
            selectedKeys={[formData.tipo || 'ingreso']}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0];
              setFormData(prev => ({ ...prev, tipo: selected as string }));
            }}
          >
            <SelectItem key="ingreso">Ingreso</SelectItem>
            <SelectItem key="egreso">Egreso</SelectItem>
          </Select>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button onClick={onCancel} color="danger" variant="light" className="w-40">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} color="success" className="w-40">
          Guardar Transacción
        </Button>
      </div>
    </div>
  );
}