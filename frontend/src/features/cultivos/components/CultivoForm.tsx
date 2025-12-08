// src/features/cultivos/components/CultivoForm.tsx
import { useState, useEffect, type ReactElement } from "react";
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
  Tooltip,
} from "@heroui/react";
import { toast } from "sonner";
import { UploadCloud, Settings, Edit, Trash2 } from "lucide-react";
import { obtenerLotesDisponibles } from "../api/lotesApi";
import { obtenerSublotesDisponiblesPorLote } from "../api/sublotesApi";
import { actualizarTipoCultivo, eliminarTipoCultivo } from "../api/cultivosApi";
import type { Lote, Sublote } from "../interfaces/cultivos";

interface CultivoFormProps {
  initialData?: any;
  tiposCultivo: any[];
  cultivos: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function CultivoForm({
  initialData = {},
  tiposCultivo,
  cultivos = [],
  onSave,
  onCancel,
}: CultivoFormProps): ReactElement {
  const [formData, setFormData] = useState({
    Estado: "Activo",
    ...initialData,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showNewTipoInput, setShowNewTipoInput] = useState(false);
  const [newTipoCultivoName, setNewTipoCultivoName] = useState("");

  // Estados para lotes y sublotes
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [sublotes, setSublotes] = useState<Sublote[]>([]);
  const [isLoadingSublotes, setIsLoadingSublotes] = useState(false);
  const [tieneSublotes, setTieneSublotes] = useState(false);

  // Estados de modales para tipos de cultivo
  const [showTipoModal, setShowTipoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTipo, setEditingTipo] = useState<any>(null);
  const [deleteTipo, setDeleteTipo] = useState<any>(null);
  const [editTipoName, setEditTipoName] = useState("");

  useEffect(() => {
    // Función auxiliar segura para extraer YYYY-MM-DD
    const formatearFechaSegura = (fecha: any) => {
      if (!fecha) return "";
      // Si ya es string, tomamos los primeros 10 caracteres (YYYY-MM-DD)
      if (typeof fecha === 'string') return fecha.substring(0, 10);
      // Si por error llega como objeto Date, lo convertimos a ISO y cortamos
      return new Date(fecha).toISOString().split('T')[0];
    };

    setFormData({
      Estado: "Activo",
      ...initialData,
      // Forzamos que la fecha sea solo el string limpio
      Fecha_Plantado: formatearFechaSegura(initialData.Fecha_Plantado)
    });
    setShowNewTipoInput(false);
    setNewTipoCultivoName("");
    setImageFile(null);
    // Si viene en modo edición y tiene lote, cargar los sublotes de ese lote
    if (initialData.loteId) {
      fetchSublotes(initialData.loteId);
    }
  }, [initialData]);

  // Función para cargar lotes disponibles
  const loadLotes = async (showToasts = true) => {
    try {
      const response = await obtenerLotesDisponibles();
      const lotesData = response.data || [];
      setLotes(lotesData);

      if (lotesData.length === 0 && showToasts) {

        toast.info(
          "No hay lotes disponibles para asignar cultivos. Crea lotes en estado 'En preparación' primero.",
          {
            duration: 8000,
            description:
              "Los lotes deben estar en estado 'En preparación' para poder asignarles cultivos.",
          }
        );
      }
    } catch (error) {
      if (showToasts) {
        toast.error("Error al cargar listado de lotes disponibles");
      }
    }
  };


  // Cargar Lotes Disponibles al iniciar
  useEffect(() => {
    loadLotes();
  }, []);

  // Este useEffect ya no es necesario ya que ahora cargamos lotes disponibles directamente
  // y los sublotes se cargan solo cuando se selecciona un lote específico

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "tipoCultivoId" && value === "otro") {
      setShowNewTipoInput(true);
    } else {
      if (name === "tipoCultivoId") {
        setShowNewTipoInput(false);
      }
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  // Manejador específico para cambio de Lote
  const handleLoteChange = (keys: any) => {
    const loteId = Array.from(keys)[0] as string;
    if (loteId) {
      setFormData((prev: any) => ({
        ...prev,
        loteId: loteId,
        subloteId: null,
      })); // Reset sublote
      fetchSublotes(Number(loteId));
    } else {
      // Si no hay lote seleccionado, limpiar todo
      setFormData((prev: any) => ({ ...prev, loteId: null, subloteId: null }));
      setSublotes([]);
      setTieneSublotes(false);
    }
  };

  // --- ✅ CORRECCIÓN AQUÍ ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.info(`Archivo "${file.name}" seleccionado.`);
      // Guarda el objeto File completo en el estado para subirlo después
      setImageFile(file);
      // También actualiza el formData para mostrar preview si es necesario
      setFormData((prev: any) => ({ ...prev, img: URL.createObjectURL(file) }));
    }
  };

  const handleEditTipo = (tipo: any) => {
    setEditingTipo(tipo);
    setEditTipoName(tipo.nombre);
    setShowEditModal(true);
  };

  const handleDeleteTipoClick = (tipo: any) => {
    // Verificar si el tipo tiene cultivos asociados
    const cultivosAsociados = cultivos.filter(
      (c) => c.tipoCultivo?.id === tipo.id
    );

    if (cultivosAsociados.length > 0) {
      toast.error(
        `No se puede eliminar el tipo "${tipo.nombre}" porque tiene ${cultivosAsociados.length} cultivo(s) asociado(s).`
      );
      return;
    }

    setDeleteTipo(tipo);
    setShowDeleteModal(true);
  };

  // Función para cargar sublotes disponibles cuando cambia el lote
  const fetchSublotes = async (loteId: number) => {
    setIsLoadingSublotes(true);
    setSublotes([]); // Limpiar anteriores
    try {
      const response = await obtenerSublotesDisponiblesPorLote(loteId);

      // Manejar diferentes estructuras de respuesta posibles
      let sublotesData: Sublote[] = [];
      if (response?.data) {
        if (Array.isArray(response.data)) {
          sublotesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          sublotesData = response.data.data;
        } else if (
          typeof response.data === "object" &&
          response.data !== null
        ) {
          // Si es un objeto, intentar extraer data
          sublotesData = response.data.data || response.data || [];
        }
      }

      // Asegurar que siempre sea un array
      if (!Array.isArray(sublotesData)) {
        sublotesData = [];
      }

      setSublotes(sublotesData);
      setTieneSublotes(sublotesData.length > 0);

      if (sublotesData.length === 0) {
      }
    } catch (error) {
      setSublotes([]); // En caso de error, asegurar array vacío
      setTieneSublotes(false);
    } finally {
      setIsLoadingSublotes(false);
    }
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
      await actualizarTipoCultivo(editingTipo.id, {
        nombre: editTipoName.trim(),
      });
      toast.success("Tipo de cultivo actualizado correctamente");
      setShowEditModal(false);
      setEditingTipo(null);
      setEditTipoName("");
      // Refresh tiposCultivo - this would need to be passed as prop or callback
      window.location.reload(); // Simple refresh for now
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Error al actualizar tipo de cultivo"
      );
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
      toast.error(
        error.response?.data?.message || "Error al eliminar tipo de cultivo"
      );
    }
  };

  const handleSubmit = () => {
    const { nombre, cantidad, Fecha_Plantado, loteId, subloteId } = formData;
    const tipoCultivoId = formData.tipoCultivoId;

    // Validación básica
    if (!nombre || !cantidad || (!tipoCultivoId && !showNewTipoInput) || !Fecha_Plantado || !loteId) {
      toast.error("Nombre, Cantidad, Tipo, Fecha y Lote son obligatorios.");
      return;
    }

    // --- NUEVA VALIDACIÓN ---
    // Si el lote tiene subdivisiones (tieneSublotes es true) y NO se ha seleccionado subloteId
    if (tieneSublotes && (!subloteId || subloteId === "null" || subloteId === "")) {
      toast.error("Este lote tiene divisiones. Debes seleccionar una Ubicación Específica obligatoriamente.");
      return;
    }
    // ------------------------

    if (showNewTipoInput && !newTipoCultivoName.trim()) {
      toast.error("Por favor, ingresa el nombre del nuevo tipo de cultivo.");
      return;
    }

    const payload: any = {
      nombre: formData.nombre,
      cantidad: parseInt(cantidad, 10),
      tipoCultivoId: showNewTipoInput
        ? null
        : tipoCultivoId
        ? parseInt(tipoCultivoId, 10)
        : null,
      loteId: parseInt(loteId, 10), // Enviar Lote como número
      Fecha_Plantado: formData.Fecha_Plantado,
      descripcion: formData.descripcion,
      Estado: formData.Estado,
    };

    // Solo agregar subloteId si existe y es válido
    if (
      formData.subloteId &&
      formData.subloteId !== "" &&
      formData.subloteId !== "null"
    ) {
      payload.subloteId = parseInt(formData.subloteId, 10);
    }

    // Solo agregar img si existe
    if (formData.img) {
      payload.img = formData.img;
    }

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
        value={formData.nombre || ""}
        onChange={handleChange}
        placeholder="Ej: Tomates Cherry"
        fullWidth
      />

      {/* --- SELECCIÓN DE LOTE Y SUBLOTE --- */}
      <div className="flex gap-4">
        <Select
          label="Lote Principal"
          placeholder="Seleccionar lote"
          selectedKeys={formData.loteId ? [formData.loteId.toString()] : []}
          onSelectionChange={handleLoteChange}
          fullWidth
          isRequired
        >
          {lotes.map((lote) => (
            <SelectItem key={lote.id.toString()} textValue={lote.nombre}>
              {lote.nombre} ({lote.estado})
            </SelectItem>
          ))}
        </Select>

        <Select
          label="Ubicación Específica"
          // Cambiamos el placeholder para que sea más claro
          placeholder={
            !formData.loteId
              ? "Primero elige un lote"
              : isLoadingSublotes
              ? "Cargando..."
              : tieneSublotes
              ? "Selecciona una división (Requerido)"  // <--- Cambio aquí
              : "Lote completo (Sin divisiones)"
          }
          selectedKeys={formData.subloteId ? [formData.subloteId.toString()] : []}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string;
            handleChange({ target: { name: "subloteId", value } } as any);
          }}
          fullWidth
          // Deshabilitado si no hay lote o está cargando.
          // OJO: Si tieneSublotes es true, el usuario DEBE poder interactuar, así que NO lo deshabilites si tieneSublotes es true.
          isDisabled={!formData.loteId || isLoadingSublotes}

          // Solo permitir limpiar (X) si NO tiene sublotes (o sea, si es opcional)
          isClearable={!tieneSublotes}

          // Marcar visualmente como requerido si tiene sublotes
          isRequired={tieneSublotes}
          errorMessage={tieneSublotes && !formData.subloteId ? "Debes seleccionar una división" : ""}
        >
          {Array.isArray(sublotes)
            ? sublotes.map((sub) => (
                <SelectItem key={sub.id.toString()} textValue={sub.nombre}>
                  {sub.nombre} ({sub.estado})
                </SelectItem>
              ))
            : []}
        </Select>
      </div>

      {/* MENSAJES INFORMATIVOS */}

      {/* ELIMINAR O CAMBIAR EL MENSAJE AZUL DE "MODO GENERAL" POR UNA ADVERTENCIA */}
      {formData.loteId && tieneSublotes && !formData.subloteId && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 flex items-center gap-2">
             <b>Atención:</b> Este lote está dividido. No puedes asignar un cultivo a todo el lote.
             Por favor selecciona un <b>Sublote</b> específico.
          </p>
        </div>
      )}

      {formData.loteId && tieneSublotes && formData.subloteId && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">
            <b>Modo Específico:</b> El cultivo se asignará únicamente al
            sublote seleccionado. El resto de sublotes seguirán disponibles y el
            lote principal pasará a "Parcialmente ocupado".
          </p>
        </div>
      )}

      {formData.loteId && !tieneSublotes && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            <b>Lote sin subdivisiones:</b> Este lote no tiene sublotes
            definidos, por lo que el cultivo se aplicará a todo el lote.
          </p>
        </div>
      )}
      {/* ----------------------------------- */}

      <div className="flex items-center gap-2">
        <Select
          label="Tipo de Cultivo"
          placeholder="Seleccionar tipo"
          selectedKeys={
            showNewTipoInput
              ? ["otro"]
              : formData.tipoCultivoId
              ? [formData.tipoCultivoId.toString()]
              : []
          }
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string;
            handleChange({ target: { name: "tipoCultivoId", value } } as any);
          }}
          fullWidth
        >
          <>
            {tiposCultivo.map((tipo) => (
              <SelectItem key={tipo.id.toString()}>{tipo.nombre}</SelectItem>
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
        value={formData.cantidad || ""}
        onChange={handleChange}
        placeholder="0"
        fullWidth
      />

      <Input
        label="Fecha de Plantado"
        name="Fecha_Plantado"
        type="date"
        value={formData.Fecha_Plantado || ""}
        onChange={handleChange}
        fullWidth
      />

      <Select
        label="Estado del Cultivo"
        placeholder="Seleccionar estado"
        selectedKeys={[formData.Estado || "Activo"]}
        onSelectionChange={(keys) => {
          const value = Array.from(keys)[0] as string;
          handleChange({ target: { name: "Estado", value } } as any);
        }}
        fullWidth
      >
        <SelectItem key="Activo">Activo</SelectItem>
        <SelectItem key="Cosecha">En Cosecha</SelectItem>
      </Select>

      <Textarea
        label="Descripción"
        name="descripcion"
        value={formData.descripcion || ""}
        onChange={handleChange}
        placeholder="Describe las características del cultivo..."
        fullWidth
        minRows={3}
      />

      <div>
        <label className="text-sm font-medium text-gray-700">
          Imagen del Cultivo
        </label>
        <div
          className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-gray-400 focus:outline-none mt-1"
          onClick={() =>
            document.getElementById("cultivo-image-input")?.click()
          }
        >
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="w-6 h-6 text-gray-600" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                Arrastra una imagen o{" "}
                <span className="text-blue-600 underline">haz clic</span>
              </p>
            </div>
          </div>
          <input
            id="cultivo-image-input"
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button onPress={onCancel} variant="light" color="default">
          Cancelar
        </Button>
        <Button className="bg-green-600 text-white font-bold hover:bg-green-700" onPress={handleSubmit}>
          {initialData?.id ? "Actualizar Cultivo" : "Registrar Cultivo"}
        </Button>
      </div>

      {/* Modal principal para gestionar tipos de cultivo */}
      <Modal isOpen={showTipoModal} onOpenChange={closeAllModals} size="lg">
        <ModalContent>
          <ModalHeader>
            <h3 className="text-lg font-semibold text-gray-900">
              Gestionar Tipos de Cultivo
            </h3>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {tiposCultivo.map((tipo) => {
                const cultivosAsociados = cultivos.filter(
                  (c) => c.tipoCultivo?.id === tipo.id
                );
                const puedeEliminar = cultivosAsociados.length === 0;

                return (
                  <div
                    key={tipo.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">
                        {tipo.nombre}
                      </span>
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
                      <Tooltip
                        content={
                          puedeEliminar
                            ? "Eliminar tipo"
                            : "No se puede eliminar porque tiene cultivos asociados"
                        }
                      >
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
              <h3 className="text-lg font-semibold text-gray-900">
                Editar Tipo de Cultivo
              </h3>
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
        <Modal
          isOpen={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          size="sm"
        >
          <ModalContent>
            <ModalHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Eliminar Tipo de Cultivo
              </h3>
            </ModalHeader>
            <ModalBody>
              <p className="text-gray-600">
                ¿Estás seguro de que quieres eliminar el tipo{" "}
                <strong>"{deleteTipo.nombre}"</strong>?
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
