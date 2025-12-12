import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { FaTrash, FaDownload, FaArrowUp, FaArrowDown, FaFileExcel } from 'react-icons/fa';
import { Trash2, Search, Filter } from 'lucide-react';
import { obtenerTransacciones, eliminarTransaccion } from '../api/transaccionesApi';
import { exportarExcelCultivo, exportarExcelGeneral } from '../api/excelApi';
import TransaccionForm from '../components/TransaccionForm';
import type { Transaccion, TransaccionData } from '../interfaces/finanzas';
import { api } from '../../../lib/axios';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Select,
  SelectItem,
  Input,
  Card,
  CardBody,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Chip,
} from "@heroui/react";
import PermissionWrapper from "../../../components/PermissionWrapper";
import { formatToTable } from '../../../utils/dateUtils.ts';

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

interface Cultivo {
  id: number;
  nombre: string;
}

export default function GestionTransaccionesPage(): ReactElement {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: { id: number | string; tipo: string } | null }>({ isOpen: false, item: null });
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [selectedCultivoId, setSelectedCultivoId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const transRes = await obtenerTransacciones();
      // Ya viene mapeado desde la API, solo asignamos
      setTransacciones(transRes.data || []);
    } catch (error) {
      toast.error("Error al cargar las transacciones.");
    }
  };

  useEffect(() => {
    fetchData();
    cargarCultivos();
  }, []);

  const cargarCultivos = async () => {
    try {
      const response = await api.get('/finanzas/cultivos-disponibles');
      if (response.data.success) {
        setCultivos(response.data.data || []);
      }
    } catch (error) {
      toast.error("Error al cargar los cultivos");
    }
  };

  const handleDelete = (id: number | string, tipo: string) => {
    setDeleteModal({ isOpen: true, item: { id, tipo } });
  };

  const confirmDelete = async () => {
    if (!deleteModal.item) return;
    const { id, tipo } = deleteModal.item;
    try {
      await eliminarTransaccion(id);
      toast.success(`${tipo === 'ingreso' ? 'Venta' : 'Gasto'} eliminada con éxito.`);
      fetchData();
    } catch (error) {
      toast.error(`Error al eliminar la ${tipo === 'ingreso' ? 'venta' : 'gasto'}.`);
    } finally {
      setDeleteModal({ isOpen: false, item: null });
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, item: null });
  };

  const handleSave = async (data: TransaccionData) => {
    const toastId = toast.loading("Registrando transacción...");
    try {
      const endpoint = data.tipo === 'egreso' ? '/gastos-produccion' : '/ventas';
      const payload = data.tipo === 'egreso' ? {
        descripcion: data.descripcion,
        monto: data.monto,
        fecha: data.fecha,
        produccion: data.produccionId
      } : data;

      await api.post(endpoint, payload);

      toast.success("Transacción registrada con éxito", { id: toastId });
      closeModal();
      fetchData();
    } catch (error: any) {
      const errorMessage = error.message || "Error al guardar la transacción";
      toast.error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage, { id: toastId });
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransacciones = transacciones.filter(t =>
    t && t.descripcion && t.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-2 sm:p-6 bg-gray-50 min-h-full">
      {/* Header separado del card */}
      <div className="flex flex-col gap-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-700">Gestión de Transacciones</h1>

          <div className="flex flex-wrap gap-2">
            <PermissionWrapper module="Finanzas" permission="Exportar">
              <Button
                onClick={async () => {
                  if (selectedCultivoId) {
                    try {
                      await exportarExcelCultivo(selectedCultivoId);
                      toast.success('Reporte Excel generado con éxito');
                    } catch (error) {
                      toast.error('Error al generar el reporte Excel');
                    }
                  } else {
                    toast.error("Por favor seleccione un cultivo primero");
                  }
                }}
                color="default"
                variant="solid"
                startContent={<FaFileExcel />}
                className="font-semibold"
              >
                Exportar Excel por Cultivo
              </Button>
            </PermissionWrapper>
            <PermissionWrapper module="Finanzas" permission="Exportar">
              <Button
                onClick={async () => {
                  try {
                    await exportarExcelGeneral();
                    toast.success('Reporte Excel general generado con éxito');
                  } catch (error) {
                    toast.error('Error al generar el reporte Excel general');
                  }
                }}
                color="default"
                variant="solid"
                startContent={<FaFileExcel />}
                className="font-semibold"
              >
                Exportar Excel General
              </Button>
            </PermissionWrapper>
            <PermissionWrapper module="Finanzas" permission="Crear">
              <Button
                onClick={openModal}
                color="success"
                variant="solid"
                className="font-bold text-white shadow-lg shadow-green-200"
              >
                Nueva Venta
              </Button>
            </PermissionWrapper>
          </div>
        </div>

        {/* Filtros arriba */}
        <div className="flex flex-col sm:flex-row gap-4">
          <PermissionWrapper module="Finanzas" permission="Exportar">
            <Select
              placeholder="Seleccionar Cultivo"
              className="w-full sm:w-64"
              selectedKeys={selectedCultivoId ? [selectedCultivoId.toString()] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];
                setSelectedCultivoId(selected ? Number(selected) : null);
              }}
              variant="bordered"
              startContent={<Filter size={18} className="text-green-600" />}
              classNames={{ trigger: "bg-white" }}
              aria-label="Seleccionar cultivo para filtrar"
            >
              {cultivos.map(cultivo => (
                <SelectItem key={cultivo.id.toString()}>
                  {cultivo.nombre}
                </SelectItem>
              ))}
            </Select>
          </PermissionWrapper>

          <Input
            type="text"
            placeholder="Buscar por descripción..."
            className="w-full sm:w-72"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            variant="bordered"
            startContent={<Search size={18} className="text-green-600" />}
            classNames={{ inputWrapper: "bg-white" }}
          />
        </div>
      </div>

      {/* Tabla en card separado */}
      <Card className="shadow-lg border border-green-200">
        <CardBody className="p-0">
          <Table
            aria-label="Transacciones"
            className="border-collapse"
            bottomContent={
              <div className="flex justify-center py-4">
                <p className="text-sm text-gray-500">
                  {filteredTransacciones.length} transacción{filteredTransacciones.length !== 1 ? 'es' : ''} encontrada{filteredTransacciones.length !== 1 ? 's' : ''}
                </p>
              </div>
            }
          >
            <TableHeader>
              <TableColumn>Fecha</TableColumn>
              <TableColumn>Tipo</TableColumn>
              <TableColumn>Descripción</TableColumn>
              <TableColumn align="end">Cantidad</TableColumn>
              <TableColumn align="center">Unidad</TableColumn>
              <TableColumn align="end">Precio Unitario</TableColumn>
              <TableColumn align="end">Valor Total</TableColumn>
              <TableColumn align="center">Acciones</TableColumn>
            </TableHeader>
            <TableBody emptyContent={"No hay transacciones que coincidan con los filtros"}>
              {filteredTransacciones.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-gray-600">
                    {formatToTable(t.fecha)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={t.tipo === 'ingreso' ? 'success' : 'danger'}
                      startContent={t.tipo === 'ingreso' ? <FaArrowUp size={12} /> : <FaArrowDown size={12} />}
                    >
                      {t.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                    </Chip>
                  </TableCell>
                  <TableCell className="font-medium text-gray-800 max-w-xs truncate" title={t.descripcion}>
                    {t.descripcion}
                  </TableCell>
                  <TableCell className="text-right font-mono text-gray-600">
                    {t.cantidad}
                  </TableCell>
                  <TableCell className="text-center text-gray-500">
                    {t.unidad || '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-gray-600">
                    {currencyFormatter.format(t.precioUnitario || 0)}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${t.tipo === 'egreso' ? 'text-red-600' : 'text-green-600'}`}>
                    {t.tipo === 'egreso' ? '-' : ''}{currencyFormatter.format(t.monto)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      {t.rutaFacturaPdf && (
                        <PermissionWrapper module="Finanzas" permission="Exportar">
                          <Button
                            isIconOnly
                            variant="light"
                            color="primary"
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await api.get(`/finanzas/transacciones/${t.id}/factura`, {
                                  responseType: 'blob'
                                });
                                const blob = response.data;
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `factura-venta-${t.id}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                                toast.success('Factura descargada con éxito');
                              } catch (error) {
                                toast.error('Error al descargar la factura');
                              }
                            }}
                            title="Descargar Factura"
                          >
                            <FaDownload />
                          </Button>
                        </PermissionWrapper>
                      )}
                      <PermissionWrapper module="Finanzas" permission="Eliminar">
                        <Button
                          isIconOnly
                          variant="light"
                          color="danger"
                          size="sm"
                          onClick={() => handleDelete(t.id, t.tipo)}
                          title={`Eliminar ${t.tipo === 'ingreso' ? 'venta' : 'gasto'}`}
                        >
                          <FaTrash />
                        </Button>
                      </PermissionWrapper>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
      {/* Modal Nueva Transacción */}
      <Modal isOpen={isModalOpen} onOpenChange={closeModal} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-gray-800">
                Registrar Nueva Venta
                <span className="text-sm font-normal text-gray-500">Ingresa la información de la venta (tipo: Ingreso)</span>
              </ModalHeader>
              <ModalBody>
                <TransaccionForm
                  onSave={handleSave}
                  onCancel={onClose}
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal Confirmación Eliminar */}
      <Modal isOpen={deleteModal.isOpen} onOpenChange={cancelDelete} size="sm">
        <ModalContent>
          <ModalHeader className="flex flex-col items-center justify-center text-center pb-2">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <h4 className="text-lg font-semibold text-center">¿Eliminar transacción?</h4>
            </div>
          </ModalHeader>
          <ModalBody className="text-center">
            <Card className="border border-gray-100 bg-gray-50/50">
              <CardBody className="py-4">
                <div className="font-medium text-gray-800">{deleteModal.item?.tipo === 'ingreso' ? 'Venta' : 'Gasto'}</div>
                <div className="text-sm text-gray-500 mt-1">Transacción financiera</div>
              </CardBody>
            </Card>
            <p className="text-sm text-gray-500 mt-4">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 mt-6 w-full justify-center">
              <Button
                onClick={cancelDelete}
                color="default"
                variant="light"
                className="flex-1 max-w-[120px] font-semibold"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                color="danger"
                className="flex-1 max-w-[120px] font-semibold"
              >
                Eliminar
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
