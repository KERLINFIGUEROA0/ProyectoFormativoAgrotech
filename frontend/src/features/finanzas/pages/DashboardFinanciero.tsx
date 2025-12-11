import { useState, useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react';
import { obtenerTransacciones, obtenerFlujoMensual } from '../api/transaccionesApi';
import FlujoMensualChart from '../components/FlujoMensualChart';
import type { Transaccion } from '../interfaces/finanzas';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Chip,
  Spinner
} from "@heroui/react";
import PermissionWrapper from "../../../components/PermissionWrapper";

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export default function DashboardFinanciero(): ReactElement {
  const navigate = useNavigate();
  const [recentMovs, setRecentMovs] = useState<Transaccion[]>([]);
  const [flujoData, setFlujoData] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [movsRes, flujoRes] = await Promise.all([
          obtenerTransacciones(),
          obtenerFlujoMensual(),
        ]);

        const allMovs = (movsRes.data || []).map((t: any) => ({
          ...t,
          tipo: t.tipo || 'ingreso',
          cantidad: t.cantidad || 1,
          precioUnitario: t.precioUnitario || t.monto,
        })).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        setRecentMovs(allMovs.slice(0, 4));
        setFlujoData(flujoRes.data || []);

      } catch (error) {
        toast.error("Error al cargar los datos del dashboard.");
        console.error("Error al cargar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <PermissionWrapper module="Finanzas" permission="Ver">
      <div className="p-2 sm:p-6 bg-gray-50 min-h-full font-sans">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Finanzas</h1>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Spinner size="lg" color="success" />
          </div>
        ) : (
          <>
            {/* Gráfico de flujo mensual combinado con Hero UI */}
            <Card className="shadow-sm border border-green-200 hover:border-green-400 mb-6">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-green-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-700">Flujo de Efectivo Mensual</h2>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <FlujoMensualChart data={flujoData} />
              </CardBody>
            </Card>

            {/* Tabla de transacciones recientes con Hero UI */}
            <Card className="shadow-sm border border-green-200 hover:border-green-400">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-700">Transacciones Recientes</h3>
                  <Chip size="sm" variant="flat" color="primary">
                    {recentMovs.length}
                  </Chip>
                </div>
                <Button
                  onClick={() => navigate('/egresos')}
                  color="success"
                  variant="solid"
                  size="sm"
                  className="font-semibold"
                >
                  Ver Todas
                </Button>
              </CardHeader>
              <CardBody className="p-0">
                <Table aria-label="Transacciones recientes" className="border-collapse">
                  <TableHeader>
                    <TableColumn>Fecha</TableColumn>
                    <TableColumn>Tipo</TableColumn>
                    <TableColumn>Descripción</TableColumn>
                    <TableColumn align="end">Cantidad</TableColumn>
                    <TableColumn align="end">Precio Unit.</TableColumn>
                    <TableColumn align="end">Valor Total</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent={"No hay transacciones recientes"}>
                    {recentMovs.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell className="text-gray-600">
                          {new Date(mov.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={mov.tipo === 'ingreso' ? 'success' : 'danger'}
                            startContent={mov.tipo === 'ingreso' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                          >
                            {mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          </Chip>
                        </TableCell>
                        <TableCell className="font-medium text-gray-800 max-w-xs truncate" title={mov.descripcion}>
                          {mov.descripcion}
                        </TableCell>
                        <TableCell className="text-right text-gray-600 font-mono">
                          {mov.cantidad}
                        </TableCell>
                        <TableCell className="text-right text-gray-600 font-mono">
                          {currencyFormatter.format(mov.precioUnitario || 0)}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${mov.tipo === 'egreso' ? 'text-red-600' : 'text-green-600'}`}>
                          {mov.tipo === 'egreso' ? '-' : ''}{currencyFormatter.format(mov.monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </PermissionWrapper>
  );
}