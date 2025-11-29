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
import { obtenerLotesDisponibles } from '../api/lotesApi';
import { obtenerSublotesDisponiblesPorLote } from '../api/sublotesApi';
import { actualizarTipoCultivo, eliminarTipoCultivo } from '../api/cultivosApi';
import type { Lote, Sublote } from '../interfaces/cultivos';

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
  
  // Estados para lotes y sublotes
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [sublotes, setSublotes] = useState<Sublote[]>([]);
  const [isLoadingSublotes, setIsLoadingSublotes] = useState(false);
  const [tieneSublotes, setTieneSublotes] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estados de modales para tipos de cultivo
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
    // Si viene en modo edición y tiene lote, cargar los sublotes de ese lote
    if (initialData.loteId) {
      fetchSublotes(initialData.loteId);
    }
  }, [initialData]);

  // Función para cargar lotes disponibles
  const loadLotes = async (showToasts = true) => {
    try {
      console.log('Cargando lotes disponibles...');
      const response = await obtenerLotesDisponibles();
      console.log('Respuesta de lotes disponibles:', response);
      const lotesData = response.data || [];
      console.log('Lotes disponibles encontrados:', lotesData.length);
      setLotes(lotesData);

      if (lotesData.length === 0 && showToasts) {
        console.warn('No se encontraron lotes disponibles. Asegúrate de que existan lotes en estado "En preparación"');
        console.log('💡 Para crear lotes disponibles:');
        console.log('1. Ve a la gestión de lotes');
        console.log('2. Crea un lote nuevo');
        console.log('3. Asegúrate de que su estado sea "En preparación"');
        console.log('4. Si el lote ya existe, cambia su estado a "En preparación"');

        toast.info("No hay lotes disponibles para asignar cultivos. Crea lotes en estado 'En preparación' primero.", {
          duration: 8000,
          description: "Los lotes deben estar en estado 'En preparación' para poder asignarles cultivos."
        });
      }
    } catch (error) {
      console.error("Error cargando lotes disponibles", error);
      if (showToasts) {
        toast.error("Error al cargar listado de lotes disponibles");
      }
    }
  };

  // Función para refrescar datos
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await loadLotes(false);
      toast.success("Datos actualizados correctamente");
    } catch (error) {
      toast.error("Error al actualizar los datos");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Función de diagnóstico global (disponible en window para debugging)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).diagnosticarSistemaCultivos = async () => {
        console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE CULTIVOS');
        console.log('=====================================');

        try {
          // Verificar lotes totales
          const lotesResponse = await fetch('/lotes/listar');
          const lotesData = await lotesResponse.json();
          console.log('📦 LOTES TOTALES:', lotesData.data?.length || 0);
          lotesData.data?.forEach((lote: any) => {
            console.log(`  - ${lote.nombre}: ${lote.estado} (${lote.sublotes?.length || 0} sublotes)`);
          });

          // Verificar lotes disponibles
          const disponiblesResponse = await fetch('/lotes/disponibles');
          const disponiblesData = await disponiblesResponse.json();
          console.log('✅ LOTES DISPONIBLES (En preparación/Parcialmente ocupado):', disponiblesData.data?.length || 0);

          // Verificar estadísticas de lotes
          const estadisticasResponse = await fetch('/lotes/estadisticas');
          const estadisticasData = await estadisticasResponse.json();
          console.log('📊 ESTADÍSTICAS DE LOTES:', estadisticasData.data);

          // Verificar cultivos
          const cultivosResponse = await fetch('/cultivos/listar');
          const cultivosData = await cultivosResponse.json();
          console.log('🌱 CULTIVOS TOTALES:', cultivosData.data?.length || 0);

          console.log('💡 RECOMENDACIONES:');
          if ((disponiblesData.data?.length || 0) === 0) {
            console.log('  - Crea lotes (se crean automáticamente en estado "En preparación")');
            console.log('  - Los lotes pasan a "Parcialmente ocupado" cuando tienen algunos cultivos');
            console.log('  - Los lotes pasan a "En cultivación" cuando están completamente ocupados');
            console.log('  - Los lotes pasan a "En mantenimiento" cuando necesitan mantenimiento');
          }
          if ((lotesData.data?.length || 0) > 0) {
            console.log('  - Asegúrate de que los lotes tengan sublotes en estado "Disponible"');
            console.log('  - Los sublotes pasan a "En cultivación" cuando se les asigna un cultivo');
          }

        } catch (error) {
          console.error('❌ Error en diagnóstico:', error);
        }
      };

      console.log('🔧 Función de diagnóstico disponible: window.diagnosticarSistemaCultivos()');
    }
  }, []);

  // Cargar Lotes Disponibles al iniciar
  useEffect(() => {
    loadLotes();
  }, []);

  // Este useEffect ya no es necesario ya que ahora cargamos lotes disponibles directamente
  // y los sublotes se cargan solo cuando se selecciona un lote específico

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

  // Manejador específico para cambio de Lote
  const handleLoteChange = (keys: any) => {
    const loteId = Array.from(keys)[0] as string;
    if (loteId) {
      setFormData((prev: any) => ({ ...prev, loteId: loteId, subloteId: null })); // Reset sublote
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
      console.log('Archivo seleccionado:', file);
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
    const cultivosAsociados = cultivos.filter(c => c.tipoCultivo?.id === tipo.id);

    if (cultivosAsociados.length > 0) {
      toast.error(`No se puede eliminar el tipo "${tipo.nombre}" porque tiene ${cultivosAsociados.length} cultivo(s) asociado(s).`);
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
      console.log(`Cargando sublotes disponibles para lote ${loteId}...`);
      const response = await obtenerSublotesDisponiblesPorLote(loteId);
      console.log('Respuesta de sublotes disponibles:', response);

      // Manejar diferentes estructuras de respuesta posibles
      let sublotesData: Sublote[] = [];
      if (response?.data) {
        if (Array.isArray(response.data)) {
          sublotesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          sublotesData = response.data.data;
        } else if (typeof response.data === 'object' && response.data !== null) {
          // Si es un objeto, intentar extraer data
          sublotesData = response.data.data || response.data || [];
        }
      }

      // Asegurar que siempre sea un array
      if (!Array.isArray(sublotesData)) {
        sublotesData = [];
      }

      console.log(`Sublotes disponibles encontrados para lote ${loteId}:`, sublotesData.length);
      setSublotes(sublotesData);
      setTieneSublotes(sublotesData.length > 0);

      if (sublotesData.length === 0) {
        console.warn(`No se encontraron sublotes disponibles en el lote ${loteId}. Solo se mostrarán sublotes en estado 'Disponible'`);
      }
    } catch (error) {
      console.error("Error cargando sublotes:", error);
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
    const { nombre, cantidad, Fecha_Plantado, loteId } = formData;
    const tipoCultivoId = formData.tipoCultivoId;

    // Validación: Lote es obligatorio
    if (!nombre || !cantidad || (!tipoCultivoId && !showNewTipoInput) || !Fecha_Plantado || !loteId) {
      toast.error("Nombre, Cantidad, Tipo, Fecha y Lote son obligatorios.");
      return;
    }
    if (showNewTipoInput && !newTipoCultivoName.trim()) {
      toast.error("Por favor, ingresa el nombre del nuevo tipo de cultivo.");
      return;
    }

    const payload: any = {
      nombre: formData.nombre,
      cantidad: parseInt(cantidad, 10),
      tipoCultivoId: showNewTipoInput ? null : (tipoCultivoId ? parseInt(tipoCultivoId, 10) : null),
      loteId: parseInt(loteId, 10), // Enviar Lote como número
      Fecha_Plantado: formData.Fecha_Plantado,
      descripcion: formData.descripcion,
      Estado: formData.Estado
    };

    // Solo agregar subloteId si existe y es válido
    if (formData.subloteId && formData.subloteId !== '' && formData.subloteId !== 'null') {
      payload.subloteId = parseInt(formData.subloteId, 10);
    }

    // Solo agregar img si existe
    if (formData.img) {
      payload.img = formData.img;
    }

    console.log('Payload a enviar:', payload);
    console.log('Image file:', imageFile);

    onSave({
      ...payload,
      imageFile,
      newTipoCultivoName: showNewTipoInput ? newTipoCultivoName : null,
    });
  };

  // Componente de diagnóstico para mostrar información del sistema
  const SistemaInfo = () => (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h4 className="font-semibold text-gray-800 mb-2">🔍 Información del Sistema</h4>
      <div className="text-sm text-gray-600 space-y-1">
        <p><strong>Lotes cargados:</strong> {lotes.length}</p>
        <p><strong>Lotes disponibles:</strong> {lotes.filter(l => ['En preparación', 'Parcialmente ocupado'].includes(l.estado)).length}</p>
        <p><strong>Lote seleccionado:</strong> {formData.loteId ? lotes.find(l => l.id.toString() === formData.loteId)?.nombre : 'Ninguno'}</p>
        <p><strong>Sublotes disponibles:</strong> {sublotes.length}</p>
        <p><strong>Tiene sublotes:</strong> {tieneSublotes ? 'Sí' : 'No'}</p>
        <p><strong>Cargando sublotes:</strong> {isLoadingSublotes ? 'Sí' : 'No'}</p>
      </div>
      <div className="mt-3 text-xs text-gray-500">
        <p>💡 <strong>Lotes disponibles:</strong> Estados "En preparación" o "Parcialmente ocupado"</p>
        <p>💡 <strong>Sublotes disponibles:</strong> Estado "Disponible" dentro del lote seleccionado</p>
        <p>💡 <strong>Estados de lote:</strong> "En preparación" → "Parcialmente ocupado" → "En cultivación" → "En mantenimiento"</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header con botón de refrescar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Información del Cultivo</h3>
        <Button
          size="sm"
          variant="light"
          onPress={refreshData}
          isLoading={isRefreshing}
          startContent={!isRefreshing && <span className="text-sm">🔄</span>}
        >
          {isRefreshing ? 'Actualizando...' : 'Refrescar'}
        </Button>
      </div>

      {/* Mostrar información de diagnóstico en desarrollo */}
      {process.env.NODE_ENV === 'development' && <SistemaInfo />}

      <Input
        label="Nombre del Cultivo"
        name="nombre"
        value={formData.nombre || ''}
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
          placeholder={
             !formData.loteId
               ? "Primero elige un lote"
               : isLoadingSublotes
                 ? "Cargando..."
                 : tieneSublotes
                   ? "Dejar vacío para TODO el lote"
                   : "Sin subdivisiones (Aplica a todo)"
          }
          selectedKeys={formData.subloteId ? [formData.subloteId.toString()] : []}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string;
            handleChange({ target: { name: 'subloteId', value } } as any);
          }}
          fullWidth
          isDisabled={!formData.loteId || isLoadingSublotes || (!tieneSublotes && !isLoadingSublotes)}
          onClear={() => handleChange({ target: { name: 'subloteId', value: null } } as any)}
        >
          {Array.isArray(sublotes) ? sublotes.map((sub) => (
            <SelectItem key={sub.id.toString()} textValue={sub.nombre}>
              {sub.nombre} ({sub.estado})
            </SelectItem>
          )) : []}
        </Select>
      </div>

      {/* MENSAJES INFORMATIVOS */}
      {formData.loteId && tieneSublotes && !formData.subloteId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            ℹ️ <b>Modo General:</b> Al no seleccionar un sublote específico, este cultivo se asignará a
            <b> todos los {sublotes.length} sublotes</b> del lote seleccionado. El estado del lote pasará a "En cultivación".
          </p>
        </div>
      )}

      {formData.loteId && tieneSublotes && formData.subloteId && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">
            📍 <b>Modo Específico:</b> El cultivo se asignará únicamente al sublote seleccionado.
            El resto de sublotes seguirán disponibles y el lote principal pasará a "Parcialmente ocupado".
          </p>
        </div>
      )}

      {formData.loteId && !tieneSublotes && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            🌱 <b>Lote sin subdivisiones:</b> Este lote no tiene sublotes definidos, por lo que el cultivo se aplicará a todo el lote.
          </p>
        </div>
      )}
      {/* ----------------------------------- */}

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
        <div
          className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-gray-400 focus:outline-none mt-1"
          onClick={() => document.getElementById('cultivo-image-input')?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="w-6 h-6 text-gray-600" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                Arrastra una imagen o <span className="text-blue-600 underline">haz clic</span>
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