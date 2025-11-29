// src/features/cultivos/components/CultivoForm.tsx
import { useState, useEffect, type ReactElement } from 'react';
import {
  Input,
  Select,
  SelectItem,
  Textarea,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Tooltip
} from "@heroui/react";
import { toast } from "sonner";
import { UploadCloud, Settings, Edit, Trash2} from 'lucide-react';
import { obtenerLotes } from '../api/lotesApi';
import { obtenerSublotesPorLote } from '../api/sublotesApi';
import { actualizarTipoCultivo, eliminarTipoCultivo } from '../api/cultivosApi';
import type { Lote } from '../interfaces/cultivos';

interface CultivoFormProps {
  initialData?: any;
  tiposCultivo: any[];
  cultivos: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function CultivoForm({ initialData = {}, tiposCultivo, cultivos = [], onSave, onCancel }: CultivoFormProps): ReactElement {
  const [formData, setFormData] = useState({ Estado: 'Activo', ...initialData });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showNewTipoInput, setShowNewTipoInput] = useState(false);
  const [newTipoCultivoName, setNewTipoCultivoName] = useState("");
  
  const [showTipoModal, setShowTipoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTipo, setEditingTipo] = useState<any>(null);
  const [deleteTipo, setDeleteTipo] = useState<any>(null);
  const [editTipoName, setEditTipoName] = useState("");

  useEffect(() => {
    setFormData({ Estado: 'Activo', ...initialData });
    setShowNewTipoInput(false);
    setNewTipoCultivoName("");
    setImageFile(null);
  }, [initialData]);

  useEffect(() => {
    const checkDependencies = async () => {
      try {
        const lotesResponse = await obtenerLotes();
        const lotes: Lote[] = lotesResponse.data || [];
        const activeLotes = lotes.filter(l => l.estado === 'Activo');

        if (activeLotes.length > 0) {
          // Check sublotes for the first active lote (no state updates needed here)
          await obtenerSublotesPorLote(activeLotes[0].id);
        }
      } catch (error) {
        console.error('Error checking dependencies:', error);
      }
    };
    checkDependencies();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'tipoCultivoId' && value === 'otro') {
      setShowNewTipoInput(true);
    } else {
      if (name === 'tipoCultivoId') {
        setShowNewTipoInput(false);
      }
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };
  
  // --- ✅ CORRECCIÓN AQUÍ ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.info(`Archivo "${file.name}" seleccionado.`);
      // Guarda el objeto File completo en el estado para subirlo después
      setImageFile(file); 
    }
  };

  const handleEditTipo = (tipo: any) => {
    setEditingTipo(tipo);
    setEditTipoName(tipo.nombre);
    setShowEditModal(true);
  };

  const handleDeleteTipoClick = (tipo: any) => {
    // Verificar si el tipo tiene cultivos asociados
    const cultivosAsociados = cultivos.filter(c => c.tipoCultivo?.id === tipo.id);

    if (cultivosAsociados.length > 0) {
      toast.error(`No se puede eliminar el tipo "${tipo.nombre}" porque tiene ${cultivosAsociados.length} cultivo(s) asociado(s).`);
      return;
    }

    setDeleteTipo(tipo);
    setShowDeleteModal(true);
  };

  const closeAllModals = () => {
    setShowTipoModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setEditingTipo(null);
    setDeleteTipo(null);
    setEditTipoName("");
  };

  const handleSaveTipoEdit = async () => {
    if (!editingTipo || !editTipoName.trim()) return;

    try {
      await actualizarTipoCultivo(editingTipo.id, { nombre: editTipoName.trim() });
      toast.success("Tipo de cultivo actualizado correctamente");
      setShowEditModal(false);
      setEditingTipo(null);
      setEditTipoName("");
      // Refresh tiposCultivo - this would need to be passed as prop or callback
      window.location.reload(); // Simple refresh for now
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al actualizar tipo de cultivo");
    }
  };

  const handleDeleteTipo = async (tipo: any) => {
    try {
      await eliminarTipoCultivo(tipo.id);
      toast.success("Tipo de cultivo eliminado correctamente");
      setShowDeleteModal(false);
      setDeleteTipo(null);
      // Refresh tiposCultivo - this would need to be passed as prop or callback
      window.location.reload(); // Simple refresh for now
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al eliminar tipo de cultivo");
    }
  };

  const handleSubmit = () => {
    const { nombre, cantidad, Fecha_Plantado } = formData;
    const tipoCultivoId = formData.tipoCultivoId;

    if (!nombre || !cantidad || (!tipoCultivoId && !showNewTipoInput) || !Fecha_Plantado) {
      toast.error("Todos los campos principales son requeridos.");
      return;
    }
    if (showNewTipoInput && !newTipoCultivoName.trim()) {
      toast.error("Por favor, ingresa el nombre del nuevo tipo de cultivo.");
      return;
    }

    const payload = {
      nombre: formData.nombre,
      cantidad: parseInt(cantidad, 10),
      tipoCultivoId: showNewTipoInput ? null : parseInt(tipoCultivoId, 10),
      Fecha_Plantado: formData.Fecha_Plantado,
      descripcion: formData.descripcion,
      Estado: formData.Estado,
      img: formData.img || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlhYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNpbiBpbWFnZW48L3RleHQ+PC9zdmc+'
    };

    onSave({
      ...payload,
      imageFile,
      newTipoCultivoName: showNewTipoInput ? newTipoCultivoName : null,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">

      <Input
        label="Nombre del Cultivo"
        name="nombre"
        value={formData.nombre || ''}
        onChange={handleChange}
        placeholder="Ej: Tomates Cherry"
        fullWidth
      />

      <div className="flex items-center gap-2">
        <Select
          label="Tipo de Cultivo"
          placeholder="Seleccionar tipo"
          selectedKeys={showNewTipoInput ? ['otro'] : formData.tipoCultivoId ? [formData.tipoCultivoId.toString()] : []}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string;
            handleChange({ target: { name: 'tipoCultivoId', value } } as any);
          }}
          fullWidth
        >
          <>
            {tiposCultivo.map((tipo) => (
              <SelectItem key={tipo.id.toString()}>
                {tipo.nombre}
              </SelectItem>
            ))}
            <SelectItem key="otro">Otro...</SelectItem>
          </>
        </Select>

        <Tooltip content="Gestionar tipos de cultivo">
          <Button
            isIconOnly
            variant="light"
            onPress={() => setShowTipoModal(true)}
          >
            <Settings size={16} />
          </Button>
        </Tooltip>
      </div>

      {showNewTipoInput && (
        <Input
          label="Nombre del Nuevo Tipo"
          value={newTipoCultivoName}
          onChange={(e) => setNewTipoCultivoName(e.target.value)}
          placeholder="Ej: Frutas Tropicales"
          fullWidth
        />
      )}

      <Input
        label="Cantidad de Plantas"
        name="cantidad"
        type="number"
        value={formData.cantidad || ''}
        onChange={handleChange}
        placeholder="0"
        fullWidth
      />

      <Input
        label="Fecha de Plantado"
        name="Fecha_Plantado"
        type="date"
        value={formData.Fecha_Plantado || ''}
        onChange={handleChange}
        fullWidth
      />

      <Select
        label="Estado del Cultivo"
        placeholder="Seleccionar estado"
        selectedKeys={[formData.Estado || 'Activo']}
        onSelectionChange={(keys) => {
          const value = Array.from(keys)[0] as string;
          handleChange({ target: { name: 'Estado', value } } as any);
        }}
        fullWidth
      >
        <SelectItem key="Activo">Activo</SelectItem>
        <SelectItem key="Cosecha">En Cosecha</SelectItem>
      </Select>

      <Textarea
        label="Descripción"
        name="descripcion"
        value={formData.descripcion || ''}
        onChange={handleChange}
        placeholder="Describe las características del cultivo..."
        fullWidth
        minRows={3}
      />

      <div>
        <label className="text-sm font-medium text-gray-700">Imagen del Cultivo</label>
        <div className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none mt-1">
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="w-6 h-6 text-gray-600" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                Arrastra una imagen o <span className="text-blue-600 underline">haz clic</span>
              </p>
            </div>
          </div>
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          onPress={onCancel}
          variant="light"
          color="default"
        >
          Cancelar
        </Button>
        <Button
          onPress={handleSubmit}
          color="primary"
        >
          {initialData?.id ? 'Actualizar Cultivo' : 'Registrar Cultivo'}
        </Button>
      </div>

      {/* Modal principal para gestionar tipos de cultivo */}
      <Modal isOpen={showTipoModal} onOpenChange={closeAllModals} size="lg">
          <ModalContent>
            <ModalHeader>
              <h3 className="text-lg font-semibold text-gray-900">Gestionar Tipos de Cultivo</h3>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {tiposCultivo.map((tipo) => {
                  const cultivosAsociados = cultivos.filter(c => c.tipoCultivo?.id === tipo.id);
                  const puedeEliminar = cultivosAsociados.length === 0;

                  return (
                    <div key={tipo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">{tipo.nombre}</span>
                        {cultivosAsociados.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {cultivosAsociados.length} cultivo(s) asociado(s)
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="primary"
                          onPress={() => handleEditTipo(tipo)}
                          aria-label="Editar tipo"
                        >
                          <Edit size={16} />
                        </Button>
                        <Tooltip content={puedeEliminar ? "Eliminar tipo" : "No se puede eliminar porque tiene cultivos asociados"}>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={() => handleDeleteTipoClick(tipo)}
                            isDisabled={!puedeEliminar}
                            aria-label="Eliminar tipo"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>

      {/* Modal para editar tipo de cultivo */}
      {showEditModal && editingTipo && (
        <Modal isOpen={showEditModal} onOpenChange={setShowEditModal} size="sm">
          <ModalContent>
            <ModalHeader>
              <h3 className="text-lg font-semibold text-gray-900">Editar Tipo de Cultivo</h3>
            </ModalHeader>
            <ModalBody>
              <Input
                label="Nombre del tipo"
                value={editTipoName}
                onChange={(e) => setEditTipoName(e.target.value)}
                placeholder="Ej: Frutas Tropicales"
                fullWidth
              />
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => {
                  setShowEditModal(false);
                  setEditingTipo(null);
                  setEditTipoName("");
                }}
              >
                Cancelar
              </Button>
              <Button
                color="primary"
                onPress={handleSaveTipoEdit}
                isDisabled={!editTipoName.trim()}
              >
                Guardar Cambios
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Modal para confirmar eliminación */}
      {showDeleteModal && deleteTipo && (
        <Modal isOpen={showDeleteModal} onOpenChange={setShowDeleteModal} size="sm">
          <ModalContent>
            <ModalHeader>
              <h3 className="text-lg font-semibold text-gray-900">Eliminar Tipo de Cultivo</h3>
            </ModalHeader>
            <ModalBody>
              <p className="text-gray-600">
                ¿Estás seguro de que quieres eliminar el tipo <strong>"{deleteTipo.nombre}"</strong>?
              </p>
              <p className="text-sm text-red-600 mt-2">
                Esta acción no se puede deshacer.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteTipo(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                color="danger"
                onPress={() => {
                  handleDeleteTipo(deleteTipo);
                  setShowDeleteModal(false);
                  setDeleteTipo(null);
                }}
              >
                Eliminar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}