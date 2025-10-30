import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// FIX 1: Allow for additional properties with a string index signature.
// This makes our interface compatible with what Recharts' <Pie> component expects.
interface DistribucionData {
  nombre: string;
  monto: number;
  [key: string]: any; // Allows any other string keys
}

interface ChartProps {
  data: DistribucionData[];
}

const COLORS = ['#7C3AED', '#06B6D4', '#F59E0B', '#F43F5E', '#10B981'];

export default function DistribucionEgresosChart({ data }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={110}
          fill="#8884d8"
          dataKey="monto"
          nameKey="nombre"
        >
          {/* FIX 2: Replace 'entry' with '_' since it's not used, to remove the warning. */}
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}