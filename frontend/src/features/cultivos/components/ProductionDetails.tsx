import { Card, CardBody } from "@heroui/react";
import type { Produccion } from '../interfaces/cultivos';

interface ProductionDetailsProps {
  production: Produccion;
}

export default function ProductionDetails({ production }: ProductionDetailsProps) {
  const cosechaVendida = production.ventas?.reduce((total, venta) => total + venta.cantidadVenta, 0) || 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Cosecha Total</h3>
          <p className="text-2xl font-bold text-gray-900">{production.cantidadOriginal || production.cantidad} kg</p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Cosecha Vendida</h3>
          <p className="text-2xl font-bold text-blue-600">{cosechaVendida} kg</p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Cantidad Disponible</h3>
          <p className="text-2xl font-bold text-green-600">{production.cantidad} kg</p>
        </CardBody>
      </Card>

      {production.ventas && production.ventas.length > 0 && (
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Historial de Ventas</h3>
            <div className="space-y-2">
              {production.ventas.map((venta) => (
                <div key={venta.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="text-sm text-gray-600">{new Date(venta.fecha).toLocaleDateString('es-ES')}</p>
                    <p className="text-sm font-medium">{venta.cantidadVenta} kg</p>
                  </div>
                  <p className="text-sm font-semibold text-green-600">${venta.valorTotalVenta}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}