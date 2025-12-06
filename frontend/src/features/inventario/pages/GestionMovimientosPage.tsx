import React, { useState, useEffect, Fragment } from 'react';
import { toast } from 'sonner';
import {
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { listarMovimientos, listarMovimientosPorMaterial, listarMateriales } from '../api/inventarioApi';
import type { MovimientoData } from '../interfaces/inventario';
import { Card, CardBody, CardHeader, Input, Select, SelectItem, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
// ✅ IMPORTAR HELPER DE CONVERSIÓN
import {  convertirStockAUnidad } from '../../../utils/unitConversion';
// ✅ IMPORTAR HELPER DE FECHAS
import { formatToTable } from '../../../utils/dateUtils.ts';

const GestionMovimientosPage: React.FC = () => {
  const [movimientos, setMovimientos] = useState<MovimientoData[]>([]);
  const [materiales, setMateriales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    cargarMovimientos();
  }, [selectedMaterial]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [movimientosResponse, materialesResponse] = await Promise.all([
        listarMovimientos(),
        listarMateriales()
      ]);
      if (movimientosResponse.success) {
        setMovimientos(movimientosResponse.data);
      }
      if (materialesResponse.success) {
        setMateriales(materialesResponse.data);
      }
    } catch (error) {
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const cargarMovimientos = async () => {
    try {
      setLoading(true);
      let response;
      if (selectedMaterial) {
        response = await listarMovimientosPorMaterial(parseInt(selectedMaterial));
      } else {
        response = await listarMovimientos();
      }
      if (response.success) {
        setMovimientos(response.data);
      }
    } catch (error) {
      toast.error('Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  const movimientosFiltrados = movimientos.filter(movimiento => {
    const matchesSearch = searchTerm === '' ||
      movimiento.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movimiento.material?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movimiento.usuario?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTipo = selectedTipo === '' || movimiento.tipo === selectedTipo;

    return matchesSearch && matchesTipo;
  });

  // Tipos de movimiento fijos para mostrar siempre ambas opciones
  const tiposMovimiento = ['ingreso', 'egreso'];

  const getTipoIcon = (tipo: string) => {
    return tipo === 'egreso' ?
      <TrendingDown className="w-4 h-4 text-red-500" /> :
      <TrendingUp className="w-4 h-4 text-green-500" />;
  };

  const getTipoLabel = (tipo: string) => {
    return tipo === 'egreso' ? 'Salida' : 'Entrada';
  };

  const formatFecha = (fecha: string) => {
    return formatToTable(fecha);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="w-6 h-6" />
          Movimientos de Inventario
        </h1>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Productos con Entrada</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {[...new Set(movimientos.filter(m => m.tipo === 'ingreso').map(m => m.material?.id).filter(id => id))].length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {movimientos.filter(m => m.tipo === 'ingreso').length} movimientos de entrada
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-600">Productos con Salida</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {[...new Set(movimientos.filter(m => m.tipo === 'egreso').map(m => m.material?.id).filter(id => id))].length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {movimientos.filter(m => m.tipo === 'egreso').length} movimientos de salida
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Total de Movimientos</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {movimientos.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Todos los movimientos registrados
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-800">Filtros</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="text"
              placeholder="Buscar por descripción, material o usuario..."
              startContent={<Search className="w-4 h-4" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              placeholder="Todos los tipos"
              startContent={<Filter className="w-4 h-4" />}
              selectedKeys={[selectedTipo]}
              onSelectionChange={(keys) => setSelectedTipo(Array.from(keys)[0] as string)}
            >
              <SelectItem key="">Todos los tipos</SelectItem>
              <Fragment>
                {tiposMovimiento.map((tipo) => (
                  <SelectItem key={tipo}>{getTipoLabel(tipo)}</SelectItem>
                ))}
              </Fragment>
            </Select>
            <Select
              placeholder="Todos los materiales"
              startContent={<Package className="w-4 h-4" />}
              selectedKeys={[selectedMaterial]}
              onSelectionChange={(keys) => setSelectedMaterial(Array.from(keys)[0] as string)}
            >
              <SelectItem key="">Todos los materiales</SelectItem>
              <Fragment>
                {materiales.map((material) => (
                  <SelectItem key={material.id.toString()}>
                    {material.nombre}
                  </SelectItem>
                ))}
              </Fragment>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Tabla de Movimientos */}
      <Card>
        <CardBody>
          <Table aria-label="Tabla de movimientos">
            <TableHeader>
              <TableColumn>Tipo</TableColumn>
              <TableColumn>Material</TableColumn>
              <TableColumn>Cantidad</TableColumn>
              <TableColumn>Descripción</TableColumn>
              <TableColumn>Usuario</TableColumn>
              <TableColumn>Fecha</TableColumn>
              <TableColumn>Referencia</TableColumn>
            </TableHeader>
            <TableBody emptyContent={"No se encontraron movimientos"}>
              {movimientosFiltrados.map((movimiento) => {

                // 1️⃣ INTENTAR EXTRAER LA UNIDAD DE LA DESCRIPCIÓN (Ej: "Devolución sobrante: 200 cm3 - ...")
                let unidadExtraida = null;
                const descripcion = movimiento.descripcion || '';
                const matchUnidad = descripcion.match(/Devolución.*?:\s*(\d+(?:\.\d+)?)\s*([a-zA-Z0-9³]+)(?:\s*-)?/);
                if (matchUnidad) {
                  unidadExtraida = matchUnidad[2]; // Ej: "cm3", "kg", "L"
                  console.log('🎯 UNIDAD EXTRAIDA de descripción:', descripcion, '->', unidadExtraida);
                } else {
                  console.log('❌ No se pudo extraer unidad de:', descripcion);
                }

                // 2️⃣ SI NO SE EXTRAJO, USAR LA UNIDAD PREFERIDA DEL MATERIAL
                const unidadPreferidaRaw = unidadExtraida
                  || (movimiento.material as any)?.medidasDeContenido
                  || (movimiento.material as any)?.unidadBase
                  || 'Unidad';

                // 3️⃣ NORMALIZAR PARA CÁLCULOS (l minúscula para que la función entienda)
                const unidadCalculo = unidadPreferidaRaw.toLowerCase() === 'l' ? 'l' : unidadPreferidaRaw.toLowerCase();

                // 4️⃣ ETIQUETA VISUAL (L mayúscula para que se vea bonito)
                const unidadVisualLabel = unidadPreferidaRaw.toLowerCase() === 'l' ? 'L' : unidadPreferidaRaw;

                // 5️⃣ CÁLCULO DE LA CANTIDAD VISUAL
                let cantidadVisual = 0;

                // Si extrajimos la unidad de la descripción, significa que la cantidad ya está en la unidad correcta
                if (unidadExtraida) {
                  cantidadVisual = Number(movimiento.cantidad);
                }
                // Si no, convertimos la cantidad base a la unidad visual
                else {
                  // Si es una herramienta (no consumible), la cantidad es directa
                  if ((movimiento.material as any)?.tipoConsumo === 'no_consumible') {
                      cantidadVisual = Number(movimiento.cantidad);
                  }
                  // Si es insumo (consumible), hacemos la conversión
                  else {
                      cantidadVisual = convertirStockAUnidad(Number(movimiento.cantidad), unidadCalculo);
                  }
                }

                // Formateo para quitar decimales innecesarios (ej: 50.00 -> 50, pero 0.5 -> 0.5)
                const cantidadFinal = Number.isInteger(cantidadVisual)
                    ? cantidadVisual
                    : parseFloat(cantidadVisual.toFixed(4)); // Máximo 4 decimales

                return (
                <TableRow key={movimiento.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTipoIcon(movimiento.tipo)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        movimiento.tipo === 'egreso'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {getTipoLabel(movimiento.tipo)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {movimiento.material?.nombre || 'N/A'}
                      </span>
                    </div>
                  </TableCell>
                  {/* ✅ CELDA DE CANTIDAD ACTUALIZADA */}
                  <TableCell>
                    <span className="font-semibold">{cantidadFinal}</span>
                    <span className="text-xs text-gray-600 ml-1 font-bold">
                      {unidadVisualLabel}
                    </span>
                  </TableCell>
                  <TableCell>{movimiento.descripcion || 'Sin descripción'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {movimiento.usuario ?
                          `${movimiento.usuario.nombre} ${movimiento.usuario.apellidos}` :
                          'Sistema'
                        }
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {formatFecha(movimiento.fecha)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{movimiento.referencia || 'N/A'}</TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
};

export default GestionMovimientosPage;