import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, FileText, Plus, Search } from 'lucide-react';
import type { Ficha, FichaForm } from '../interfaces/fichas';
import { getFichas, createFicha, updateFicha, deleteFicha } from '../api/fichas';
import FichaFormComponent from './FichaForm';
import { SmartPermissionWrapper } from '../../../components/PermissionWrapper';
import {
  Input,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/react";

export default function GestionFichas(): ReactElement {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingFicha, setEditingFicha] = useState<Ficha | null>(null);
  const [formData, setFormData] = useState<Partial<FichaForm>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fichaToDelete, setFichaToDelete] = useState<Ficha | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredFichas, setFilteredFichas] = useState<Ficha[]>([]);

  const loadFichas = async () => {
    try {
      const data = await getFichas();
      const fichasWithCount = data.map(ficha => ({
        ...ficha,
        usuariosCount: ficha.usuarios?.length || 0
      }));
      setFichas(fichasWithCount);
      setFilteredFichas(fichasWithCount);
    } catch (error) {
      toast.error('Error al cargar las fichas');
    }
  };

  useEffect(() => {
    loadFichas();
  }, []);

  useEffect(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const newFilteredFichas = fichas.filter(ficha =>
      ficha.nombre.toLowerCase().includes(lowercasedSearchTerm) ||
      ficha.id_ficha.toLowerCase().includes(lowercasedSearchTerm)
    );
    setFilteredFichas(newFilteredFichas);
  }, [searchTerm, fichas]);

  const handleCreate = () => {
    setEditingFicha(null);
    setFormData({});
    setShowForm(true);
  };

  const handleEdit = (ficha: Ficha) => {
    setEditingFicha(ficha);
    setFormData({
      nombre: ficha.nombre,
      id_ficha: ficha.id_ficha,
    });
    setShowForm(true);
  };

  const handleDeleteClick = (ficha: Ficha) => {
    setFichaToDelete(ficha);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fichaToDelete) return;

    try {
      await deleteFicha(fichaToDelete.id);
      toast.success('Ficha eliminada exitosamente');
      loadFichas();
      setShowDeleteModal(false);
      setFichaToDelete(null);
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al eliminar la ficha';
      toast.error(errorMessage);
      setShowDeleteModal(false);
      setFichaToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setFichaToDelete(null);
  };

  const handleSave = async (data: FichaForm) => {
    try {
      if (editingFicha) {
        await updateFicha(editingFicha.id, data);
        toast.success('Ficha actualizada exitosamente');
      } else {
        await createFicha({
          nombre: data.nombre!,
          id_ficha: data.id_ficha!
        });
        toast.success('Ficha creada exitosamente');
      }
      setShowForm(false);
      loadFichas();
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar la ficha';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingFicha(null);
    setFormData({});
  };

  return (
    <div className="bg-white shadow-xl rounded-xl p-4 md:p-6 w-full h-full flex flex-col">
      <div className="flex-shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 md:mb-6 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-700">Gestión de Fichas</h1>
            <p className="text-sm text-gray-500 mt-1">Administra las fichas de formación del sistema</p>
          </div>
          <SmartPermissionWrapper module="Fichas" action="Crear">
            <Button
              onClick={handleCreate}
              color="success"
              startContent={<Plus size={16} />}
              size="sm"
              className="w-full sm:w-auto font-bold text-white"
            >
              Nueva Ficha
            </Button>
          </SmartPermissionWrapper>
        </div>

        <div className="mb-6">
          <Input
            type="text"
            placeholder="Buscar por nombre o código de ficha..."
            startContent={<Search className="text-gray-400 h-4 w-4" />}
            className="max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {showForm && (
        <Modal isOpen={showForm} onOpenChange={handleCancel} size="lg">
          <ModalContent>
            <ModalHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingFicha ? 'Editar Ficha' : 'Crear Nueva Ficha'}
                  </h3>
                  <p className="text-sm text-gray-600">Complete la información requerida</p>
                </div>
              </div>
            </ModalHeader>
            <ModalBody>
              <FichaFormComponent
                initialData={formData}
                onSave={handleSave}
                onCancel={handleCancel}
                editingId={editingFicha?.id || null}
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {showDeleteModal && fichaToDelete && (
        <Modal isOpen={showDeleteModal} onOpenChange={(open) => {
          if (!open) {
            setShowDeleteModal(false);
            setFichaToDelete(null);
          }
        }}>
          <ModalContent>
            <ModalHeader className="flex flex-col items-center justify-center text-center pb-2">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="text-red-600" size={20} />
                </div>
                <h4 className="text-lg font-semibold text-center">¿Eliminar ficha?</h4>
              </div>
            </ModalHeader>
            <ModalBody className="text-center">
              <div className="w-full bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm text-gray-700 mx-auto max-w-xs">
                <div className="font-medium">{fichaToDelete.nombre}</div>
                <div className="text-xs text-gray-500 mt-1">Código: {fichaToDelete.id_ficha}</div>
              </div>
              <p className="text-xs text-gray-500 mt-3">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3 mt-4 w-full justify-center">
                <Button
                  onClick={handleDeleteCancel}
                  color="default"
                  variant="light"
                  className="flex-1 max-w-[120px]"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  color="danger"
                  className="flex-1 max-w-[120px]"
                >
                  Eliminar
                </Button>
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {!showForm && !showDeleteModal && (
        <div className="overflow-auto flex-grow min-h-0 rounded-lg border border-gray-200 bg-white shadow-sm">
          <Table aria-label="Tabla de fichas" removeWrapper className="min-w-[600px]">
         <TableHeader>
           <TableColumn className="min-w-[200px] py-2 px-3 text-xs font-semibold">Nombre de la Ficha</TableColumn>
           <TableColumn className="min-w-[120px] py-2 px-3 text-xs font-semibold">Código</TableColumn>
           <TableColumn className="min-w-[120px] py-2 px-3 text-xs font-semibold text-center">Usuarios</TableColumn>
           <TableColumn className="min-w-[100px] py-2 px-3 text-xs font-semibold text-center">Acciones</TableColumn>
         </TableHeader>
         <TableBody emptyContent={
           <div className="flex flex-col items-center gap-3 py-8">
             <FileText className="h-10 w-10 text-gray-400" />
             <div className="text-gray-500 text-sm">
               {searchTerm ? 'No se encontraron fichas que coincidan con la búsqueda' : 'No hay fichas registradas'}
             </div>
             {searchTerm && (
               <Button
                 onClick={() => setSearchTerm('')}
                 color="primary"
                 variant="light"
                 size="sm"
               >
                 Limpiar búsqueda
               </Button>
             )}
           </div>
         }>
           {filteredFichas.map((ficha) => (
             <TableRow key={ficha.id} className="h-12">
               <TableCell className="py-2 px-3">
                 <div className="flex items-center gap-2">
                   <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                     <FileText size={12} />
                   </div>
                   <div>
                     <div className="font-semibold text-gray-900 text-sm truncate max-w-[160px]" title={ficha.nombre}>
                       {ficha.nombre}
                     </div>
                   </div>
                 </div>
               </TableCell>
               <TableCell className="py-2 px-3">
                 <Chip color="secondary" variant="flat" size="sm" className="text-xs px-2 py-1 h-6">
                   {ficha.id_ficha}
                 </Chip>
               </TableCell>
               <TableCell className="py-2 px-3 text-center">
                 <Chip color="primary" variant="flat" size="sm" className="text-xs px-2 py-1 h-6">
                   {ficha.usuariosCount || 0}
                 </Chip>
               </TableCell>
               <TableCell className="py-2 px-3 text-center">
                 <div className="flex justify-center gap-1">
                   <SmartPermissionWrapper module="Fichas" action="Editar">
                     <Button
                       isIconOnly
                       variant="light"
                       color="primary"
                       size="sm"
                       onClick={() => handleEdit(ficha)}
                       title="Editar ficha"
                       className="w-8 h-8"
                     >
                       <Pencil size={14} />
                     </Button>
                   </SmartPermissionWrapper>
                   <SmartPermissionWrapper module="Fichas" action="EliminarFichas">
                     <Button
                       isIconOnly
                       variant="light"
                       color="danger"
                       size="sm"
                       onClick={() => handleDeleteClick(ficha)}
                       title="Eliminar ficha"
                       className="w-8 h-8"
                     >
                       <Trash2 size={14} />
                     </Button>
                   </SmartPermissionWrapper>
                 </div>
               </TableCell>
             </TableRow>
           ))}
         </TableBody>
       </Table>
       </div>
     )}
    </div>
  );
}
