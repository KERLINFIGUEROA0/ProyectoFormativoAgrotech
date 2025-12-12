import { useState, useEffect, type ReactElement } from 'react';
import {
  Button,
  Select,
  SelectItem,
  Input,
  Textarea,
  Card,
  CardBody,
  CardHeader
} from "@heroui/react";
import type { TransaccionData } from '../interfaces/finanzas';
import { toast } from 'sonner';
import { BookText, Hash, DollarSign, Calendar, Archive } from 'lucide-react';
import { getAvailableForSale } from '../../cultivos/api/produccionApi';
import type { Produccion } from '../../cultivos/interfaces/cultivos';

interface TransaccionFormProps {
  onSave: (data: TransaccionData) => void;
  onCancel: () => void;
}

export default function TransaccionForm({ onSave, onCancel }: TransaccionFormProps): ReactElement {
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState<Partial<TransaccionData>>({
    fecha: getTodayDate(),
    tipo: 'ingreso', // Todas las ventas son ingresos
  });
  const [productions, setProductions] = useState<Produccion[]>([]);
  const [selectedProduction, setSelectedProduction] = useState<Produccion | null>(null);

  useEffect(() => {
    const fetchAvailableProductions = async () => {
      try {
        const response = await getAvailableForSale();
        setProductions(response.data);
      } catch (error) {
        toast.error("Error al cargar producciones disponibles");
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
    <div className="space-y-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <Textarea
            label="Descripción de la Venta"
            placeholder="Ej: Venta de aguacates a supermercado local"
            value={formData.descripcion || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
            variant="bordered"
            startContent={<BookText size={18} className="text-green-600" />}
            minRows={2}
            classNames={{ inputWrapper: "bg-white" }}
          />
        </div>

        <Input
          label="Cantidad Vendida (kg)"
          type="number"
          min="0.01"
          step="0.01"
          value={formData.cantidad?.toString() || ''}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (value >= 0) {
              setFormData(prev => ({ ...prev, cantidad: value }));
            }
          }}
          placeholder="Ej: 150"
          variant="bordered"
          startContent={<Hash size={18} className="text-green-600" />}
          classNames={{ inputWrapper: "bg-white" }}
        />

        <Input
          label="Precio Unitario"
          type="number"
          min="0.01"
          step="0.01"
          value={formData.monto?.toString() || ''}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (value >= 0) {
              setFormData(prev => ({ ...prev, monto: value }));
            }
          }}
          placeholder="Precio por unidad"
          variant="bordered"
          startContent={<DollarSign size={18} className="text-green-600" />}
          classNames={{ inputWrapper: "bg-white" }}
        />

        <Input
          label="Fecha de Venta"
          type="date"
          min={getTodayDate()}
          value={formData.fecha || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
          variant="bordered"
          startContent={<Calendar size={18} className="text-green-600" />}
          classNames={{ inputWrapper: "bg-white" }}
        />

        <Select
          label="Producción"
          placeholder="Seleccione una producción"
          selectedKeys={formData.produccionId ? [formData.produccionId.toString()] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0];
            const prodId = Number(selected);
            const prod = productions.find(p => p.id === prodId);
            setSelectedProduction(prod || null);
            setFormData(prev => ({ ...prev, produccionId: prodId }));
          }}
          variant="bordered"
          startContent={<Archive size={18} className="text-green-600" />}
          classNames={{ trigger: "bg-white" }}
        >
          {productions.map(prod => (
            <SelectItem key={prod.id.toString()}>
              {`${prod.cultivo.nombre} - Disponible: ${prod.cantidad} kg`}
            </SelectItem>
          ))}
        </Select>
      </div>

      {selectedProduction && formData.cantidad && (
        <div className={`p-4 rounded-lg border ${formData.cantidad > selectedProduction.cantidad
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
          }`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${formData.cantidad > selectedProduction.cantidad ? 'bg-red-100' : 'bg-green-100'
              }`}>
              <Archive size={16} className={formData.cantidad > selectedProduction.cantidad ? "text-red-600" : "text-green-600"} />
            </div>
            <div className="text-sm">
              <p className="font-bold">
                {formData.cantidad > selectedProduction.cantidad ? 'Cantidad insuficiente' : 'Disponible'}
              </p>
              <p>Solicitado: {formData.cantidad} kg • Inventario: {selectedProduction.cantidad} kg</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button onClick={onCancel} color="default" variant="light" className="font-normal text-gray-600">Cancelar</Button>
        <Button onClick={handleSubmit} color="success" className="font-bold text-white shadow-md">Registrar Venta</Button>
      </div>
    </div>
  );
}
