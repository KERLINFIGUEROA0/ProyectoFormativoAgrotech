import { useState, type ReactElement, type ChangeEvent } from 'react';
import { Button } from "@heroui/react";
import type { TransaccionData } from '../interfaces/finanzas';
import { toast } from 'sonner';
import { BookText, Hash, DollarSign, Calendar, Archive, TrendingUp, TrendingDown } from 'lucide-react';

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
    tipo: 'ingreso', // Se establece 'ingreso' como valor inicial
  });

  const handleSubmit = () => {
    // Se ajusta la validación para ser más flexible
    if (!formData.tipo || !formData.monto || !formData.descripcion || !formData.fecha || !formData.produccionId) {
      toast.error("Todos los campos son requeridos, incluyendo el ID de Producción.");
      return;
    }

    // Se asegura que los datos enviados sean correctos
    const dataToSave: TransaccionData = {
      cantidad: 1, // Se envía un valor por defecto para 'cantidad'
      ...formData
    } as TransaccionData;
    
    onSave(dataToSave);
  };

  return (
    <div className="p-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Registrar Transacción</h2>
        <p className="text-gray-500">Selecciona el tipo de movimiento y completa la información</p>
      </div>

      {/* --- CÓDIGO AÑADIDO --- */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">Tipo de Transacción</label>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => setFormData(prev => ({ ...prev, tipo: 'ingreso' }))} 
            className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 font-medium transition ${formData.tipo === 'ingreso' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 hover:bg-gray-100'}`}
          >
            <TrendingUp size={18} /> Ingreso (Venta)
          </button>
          <button 
            onClick={() => setFormData(prev => ({ ...prev, tipo: 'egreso' }))} 
            className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 font-medium transition ${formData.tipo === 'egreso' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-gray-50 hover:bg-gray-100'}`}
          >
            <TrendingDown size={18} /> Egreso (Gasto)
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="md:col-span-2">
          <FormInput 
            icon={BookText}
            label="Descripción"
            name="descripcion"
            value={formData.descripcion || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
            placeholder={formData.tipo === 'ingreso' ? 'Ej: Venta de aguacates...' : 'Ej: Compra de fertilizante...'}
          />
        </div>

        {/* --- LÓGICA CONDICIONAL AÑADIDA --- */}
        {formData.tipo === 'ingreso' ? (
          <>
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
          </>
        ) : (
          <div className="md:col-span-2">
             <FormInput 
               icon={DollarSign} 
               label="Monto Total del Egreso" 
               name="monto" 
               type="number" 
               value={formData.monto || ''} 
               onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, monto: Number(e.target.value) }))} 
               placeholder="Ej: 250000"
             />
          </div>
        )}
        
        <FormInput 
          icon={Archive}
          label="ID de Producción"
          name="produccionId"
          type="number"
          value={formData.produccionId || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, produccionId: Number(e.target.value) }))}
          placeholder="ID de la cosecha asociada"
        />
        <FormInput 
          icon={Calendar}
          label="Fecha"
          name="fecha"
          type="date"
          value={formData.fecha || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
        />
      </div>

      <div className="flex justify-center gap-4">
        <Button onClick={onCancel} className="bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200 w-40">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} className="bg-green-600 text-white hover:bg-green-700 w-40">
          Guardar
        </Button>
      </div>
    </div>
  );
}