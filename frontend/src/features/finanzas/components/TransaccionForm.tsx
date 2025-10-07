import { useState, type ReactElement, type ChangeEvent } from 'react';
import { Button } from "@heroui/react";
import type { TransaccionData } from '../interfaces/finanzas';
import { toast } from 'sonner';
import { BookText, Hash, DollarSign, Calendar, Archive } from 'lucide-react';

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

  const handleSubmit = () => {
    if (!formData.cantidad || !formData.monto || !formData.produccionId) {
      toast.error("La cantidad, el precio unitario y el ID de producción son requeridos.");
      return;
    }
    onSave(formData as TransaccionData);
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

        <FormInput 
          icon={Hash}
          label="Cantidad Vendida"
          name="cantidad"
          type="number"
          value={formData.cantidad || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, cantidad: Number(e.target.value) }))}
          placeholder="Ej: 150"
        />
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
        <FormInput
          icon={Archive}
          label="ID de Producción"
          name="produccionId"
          type="number"
          value={formData.produccionId || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, produccionId: Number(e.target.value) }))}
          placeholder="ID de la cosecha"
        />
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