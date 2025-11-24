import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  FileText,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { listarMovimientos, listarMovimientosPorMaterial } from '../api/inventarioApi';
import type { MovimientoData } from '../interfaces/inventario';

const GestionMovimientosPage: React.FC = () => {
  const [movimientos, setMovimientos] = useState<MovimientoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');

  useEffect(() => {
    cargarMovimientos();
  }, []);

  const cargarMovimientos = async () => {
    try {
      setLoading(true);
      const response = await listarMovimientos();
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
    const matchesMaterial = selectedMaterial === '' ||
      movimiento.material?.id.toString() === selectedMaterial;

    return matchesSearch && matchesTipo && matchesMaterial;
  });

  const tiposMovimiento = [...new Set(movimientos.map(m => m.tipo))];
  const materialesUnicos = [...new Set(movimientos.map(m => m.material).filter(m => m !== undefined && m !== null))];

  const getTipoIcon = (tipo: string) => {
    return tipo === 'EGRESO' ?
      <TrendingDown className="w-4 h-4 text-red-500" /> :
      <TrendingUp className="w-4 h-4 text-green-500" />;
  };

  const getTipoLabel = (tipo: string) => {
    return tipo === 'EGRESO' ? 'Salida' : 'Entrada';
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <button
          onClick={cargarMovimientos}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-gray-600">Productos con Entrada</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {[...new Set(movimientos.filter(m => m.tipo === 'INGRESO').map(m => m.material?.id).filter(id => id))].length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {movimientos.filter(m => m.tipo === 'INGRESO').length} movimientos de entrada
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-gray-600">Productos con Salida</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {[...new Set(movimientos.filter(m => m.tipo === 'EGRESO').map(m => m.material?.id).filter(id => id))].length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {movimientos.filter(m => m.tipo === 'EGRESO').length} movimientos de salida
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
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
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descripción, material o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-lg p-2"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-lg p-2 bg-white"
            >
              <option value="">Todos los tipos</option>
              {tiposMovimiento.map(tipo => (
                <option key={tipo} value={tipo}>{getTipoLabel(tipo)}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Package className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-lg p-2 bg-white"
            >
              <option value="">Todos los materiales</option>
              {materialesUnicos.map(material => (
                <option key={material.id} value={material.id}>
                  {material.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Movimientos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referencia
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movimientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron movimientos
                  </td>
                </tr>
              ) : (
                movimientosFiltrados.map((movimiento) => (
                  <tr key={movimiento.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTipoIcon(movimiento.tipo)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          movimiento.tipo === 'EGRESO'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {getTipoLabel(movimiento.tipo)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {movimiento.material?.nombre || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movimiento.cantidad}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movimiento.descripcion || 'Sin descripción'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {movimiento.usuario ?
                            `${movimiento.usuario.nombre} ${movimiento.usuario.apellidos}` :
                            'Sistema'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {formatFecha(movimiento.fecha)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movimiento.referencia || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GestionMovimientosPage;