import type { ReactElement } from 'react';
import type { EstadisticasCardProps } from '../interfaces/finanzas';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export default function EstadisticasCard({ icon, title, value, color }: EstadisticasCardProps): ReactElement {
  const colors: { [key: string]: string } = {
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-100 text-red-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`p-3 rounded-full ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <p className="font-bold text-xl">
          {typeof value === 'number' ? currencyFormatter.format(value) : value}
        </p>
      </div>
    </div>
  );
};