import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
// --- AÑADIR IMPORTS ---
import {
  ClipboardList,
  UserCheck,
  Loader2,
  Search,
  Users,
  Filter,
  Package,
  Hash,
  Plus,
  X,
} from 'lucide-react';
import { Input, Select, SelectItem, Button, Textarea, Checkbox } from '@heroui/react';
// --- MODIFICAR IMPORT ---
import {
   asignarActividad,
   obtenerMaterialesDisponibles, // <-- AÑADIR
   obtenerLotesParaActividades,
   obtenerSublotesParaActividades,
} from '../api/actividadesapi';
import type {
   AsignarActividadPayload,
   UsuarioSimple,
   CultivoSimple,
   LoteSimple,
   SubloteSimple,
   // --- AÑADIR IMPORT ---
   MaterialUsado,
} from '../interfaces/actividades';
// --- AÑADIR IMPORT ---
import type { Material } from '../../inventario/interfaces/inventario';
import { UnidadMedida } from '../../inventario/interfaces/inventario';
import { obtenerUnidadesDisponibles, esUnidadEmpaque, FACTORES_CONVERSION } from '../../../utils/unitConversion';

interface AsignacionFormProps {
  usuarios: UsuarioSimple[];
  cultivos: CultivoSimple[];
  onCancel: () => void;
  onSuccess: () => void;
}

// --- AÑADIR INTERFAZ ---
interface MaterialSeleccionado extends MaterialUsado {
  nombre: string;
  stockDisponible: number;
  unidadMedida: UnidadMedida;
}

interface AsignacionFormState {
   titulo: string;
   descripcion: string;
   fecha: string;
   cultivo: string;
   lote: string;
   sublote: string;
   aprendices: number[];
   responsable: string;
   searchTerm: string;
   selectedFicha: string;
   // --- AÑADIR CAMPOS ---
   materiales: MaterialSeleccionado[];
   materialActual: string; // ID
   cantidadMaterial: number | string;
   unidadSeleccionada: UnidadMedida; // Nueva unidad seleccionada
   archivosIniciales: FileList | null;
   // --- FIN CAMPOS ---
}

const AsignacionActividadForm: React.FC<AsignacionFormProps> = ({
  usuarios,
  cultivos,
  onCancel,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<AsignacionFormState>({
    titulo: '',
    descripcion: '',
    fecha: new Date().toISOString().substring(0, 10),
    cultivo: '',
    lote: '',
    sublote: '',
    aprendices: [],
    responsable: '',
    searchTerm: '',
    selectedFicha: '',
    // --- AÑADIR ESTADO ---
    materiales: [],
    materialActual: '',
    cantidadMaterial: 1,
    unidadSeleccionada: UnidadMedida.UNIDAD,
    archivosIniciales: null,
    // --- FIN ESTADO ---
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // --- AÑADIR ESTADO ---
  const [materialesDisponibles, setMaterialesDisponibles] = useState<Material[]>([]);
  const [lotesDisponibles, setLotesDisponibles] = useState<LoteSimple[]>([]);
  const [sublotesDisponibles, setSublotesDisponibles] = useState<SubloteSimple[]>([]);
  // --- FIN ESTADO ---

  // Función para calcular el stock TOTAL en UNIDAD BASE (g o ml)
  const calcularStockDisponible = (material: Material): number => {
    // STOCK UNIFICADO: Todo el inventario es un único tanque/pila
    // 'material.cantidad' YA ES el total en gramos/ml (ej: 2,500,000)
    // No hay distinción entre paquetes cerrados y abiertos.
    return material.cantidad;
  };

  // Función para calcular el costo estimado
  const calcularCostoEstimado = (material: Material, cantidad: number, unidad: UnidadMedida): number => {
    if (material.tipoConsumo !== 'consumible' || !material.precio) return 0;
    if (!material.pesoPorUnidad || material.pesoPorUnidad === 0) return 0;

    // 1. Obtener factor de la unidad seleccionada (Ej: si eligió Kg, factor es 1000)
    const factor = FACTORES_CONVERSION[unidad] || 1;

    // 2. Calcular cuántos GRAMOS/ML está pidiendo el usuario
    // Si elige "2 Kg", son 2 * 1000 = 2000 gramos.
    const cantidadEnBase = cantidad * factor;

    // 3. Calcular el precio por GRAMO/ML
    // Precio del paquete / Peso del paquete en gramos
    const precioPorUnidadBase = material.precio / material.pesoPorUnidad;

    return precioPorUnidadBase * cantidadEnBase;
  };

  // ... (useMemo de fichasUnicas y usuariosFiltrados sin cambios) ...
  const fichasUnicas = useMemo(() => {
    // ...
    const fichas = usuarios
      .filter(u => u.ficha && u.ficha.id_ficha)
      .map(u => u.ficha!)
      .filter((ficha, index, self) =>
        index === self.findIndex(f => f.id_ficha === ficha.id_ficha)
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    return fichas;
  }, [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    // ...
    return usuarios.filter(usuario => {
      const matchesSearch = formData.searchTerm === '' ||
        usuario.nombre.toLowerCase().includes(formData.searchTerm.toLowerCase()) ||
        usuario.apellidos.toLowerCase().includes(formData.searchTerm.toLowerCase()) ||
        usuario.identificacion.toString().includes(formData.searchTerm);
      const matchesFicha = formData.selectedFicha === '' ||
        usuario.ficha?.id_ficha === formData.selectedFicha;
      return matchesSearch && matchesFicha;
    });
  }, [usuarios, formData.searchTerm, formData.selectedFicha]);


  // --- AÑADIR USEEFFECT PARA CARGAR MATERIALES ---
  useEffect(() => {
    const cargarMateriales = async () => {
      try {
        const materiales = await obtenerMaterialesDisponibles();
        setMaterialesDisponibles(materiales);
      } catch (error) {
        toast.error('No se pudieron cargar los materiales del inventario.');
      }
    };
    cargarMateriales();
  }, []);
  // --- FIN USEEFFECT ---

  // --- AÑADIR USEEFFECT PARA CARGAR LOTES ---
  useEffect(() => {
    const cargarLotes = async () => {
      try {
        const lotes = await obtenerLotesParaActividades();
        setLotesDisponibles(lotes);
      } catch (error) {
        toast.error('No se pudieron cargar los lotes.');
      }
    };
    cargarLotes();
  }, []);
  // --- FIN USEEFFECT ---

  // --- AÑADIR USEEFFECT PARA CARGAR SUBLOTES ---
  useEffect(() => {
    const cargarSublotes = async () => {
      if (formData.lote) {
        try {
          const sublotes = await obtenerSublotesParaActividades(parseInt(formData.lote));
          setSublotesDisponibles(sublotes);
        } catch (error) {
          toast.error('No se pudieron cargar los sublotes.');
        }
      } else {
        setSublotesDisponibles([]);
      }
    };
    cargarSublotes();
  }, [formData.lote]);
  // --- FIN USEEFFECT ---

  // Obtener material seleccionado para mostrar unidad
  const materialSeleccionado = materialesDisponibles.find(m => m.id === parseInt(formData.materialActual));
  
  // Obtener unidades disponibles para el material seleccionado
  const unidadesDisponibles = materialSeleccionado
    ? obtenerUnidadesDisponibles(materialSeleccionado.tipoConsumo || 'consumible', materialSeleccionado.medidasDeContenido)
    : [UnidadMedida.UNIDAD];
  
  // --- USEEFFECT PARA ACTUALIZAR UNIDAD CUANDO CAMBIA MATERIAL ---
  useEffect(() => {
    if (materialSeleccionado && unidadesDisponibles.length > 0) {
      // Si la unidad actual no está disponible para este material, cambiar a la primera disponible
      if (!unidadesDisponibles.includes(formData.unidadSeleccionada)) {
        setFormData(prev => ({ ...prev, unidadSeleccionada: unidadesDisponibles[0] }));
      }
    }
  }, [materialSeleccionado, unidadesDisponibles, formData.unidadSeleccionada]);

  // --- CÁLCULO DINÁMICO DE STOCK EN LA UNIDAD SELECCIONADA ---
  const stockEnUnidadSeleccionada = useMemo(() => {
    if (!materialSeleccionado) return 0;

    const stockTotalBase = calcularStockDisponible(materialSeleccionado); // Total en gramos
    const unidad = formData.unidadSeleccionada;
    const factor = FACTORES_CONVERSION[unidad];

    // Si es un empaque, dividimos por el peso del empaque
    if (esUnidadEmpaque(unidad)) {
      if (materialSeleccionado.pesoPorUnidad) {
        return Math.floor(stockTotalBase / materialSeleccionado.pesoPorUnidad);
      }
      return Math.floor(stockTotalBase);
    }

    // Si es masa/volumen (Kg, g, L), usamos el factor de conversión
    // Ej: Tengo 500,000g (stockTotalBase). Selecciono Kg (factor 1000).
    // 500,000 / 1000 = 500 Kg disponibles.
    if (factor) {
        return stockTotalBase / factor;
    }

    return stockTotalBase;
  }, [materialSeleccionado, formData.unidadSeleccionada]);

  // ... (funciones de seleccionar/deseleccionar ficha sin cambios) ...
  const seleccionarTodosDeFicha = (fichaId: string) => {
    const aprendicesDeFicha = usuarios
      .filter(u => u.ficha?.id_ficha === fichaId)
      .map(u => Number(u.identificacion));
    
    setFormData(prev => ({
      ...prev,
      aprendices: [...new Set([...prev.aprendices, ...aprendicesDeFicha])]
    }));
    
    toast.success(`Se seleccionaron todos los aprendices de la ficha ${fichaId}`);
  };

  const deseleccionarTodosDeFicha = (fichaId: string) => {
    const aprendicesDeFicha = usuarios
      .filter(u => u.ficha?.id_ficha === fichaId)
      .map(u => Number(u.identificacion));
    
    setFormData(prev => ({
      ...prev,
      aprendices: prev.aprendices.filter(id => !aprendicesDeFicha.includes(id))
    }));
    
    toast.success(`Se deseleccionaron todos los aprendices de la ficha ${fichaId}`);
  };


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAprendicesChange = (identificacion: number, isChecked: boolean) => {
    setFormData((prev) => {
      if (isChecked) {
        return { ...prev, aprendices: [...prev.aprendices, identificacion] };
      } else {
        const newAprendices = prev.aprendices.filter((id) => id !== identificacion);
        // Reset responsable if they were removed from the list
        const newResponsable = newAprendices.includes(Number(prev.responsable)) ? prev.responsable : '';
        return {
          ...prev,
          aprendices: newAprendices,
          responsable: newResponsable,
        };
      }
    });
  };

  // --- AÑADIR LÓGICA PARA GESTIONAR MATERIALES ---
  const handleAddMaterial = () => {
    const id = parseInt(formData.materialActual);
    const cantidad = Number(formData.cantidadMaterial);

    if (!id || !cantidad || cantidad <= 0) {
      toast.error('Seleccione un material y una cantidad válida.');
      return;
    }

    const material = materialesDisponibles.find((m) => m.id === id);
    if (!material) return;

    // Validación de stock total
    const cantidadTotalRequerida = cantidad; // Cantidad total para la actividad

    const stockDisponibleTotal = calcularStockDisponible(material);

    if (cantidadTotalRequerida > stockDisponibleTotal) {
      const unidadTexto = material.tipoConsumo === 'consumible' && material.cantidadPorUnidad ? (material.medidasDeContenido || 'unidades') : material.tipoEmpaque;
      toast.error(
        `Stock insuficiente. Se necesitan ${cantidadTotalRequerida} ${unidadTexto}. Disponible: ${stockDisponibleTotal} ${unidadTexto}`,
      );
      return;
    }

    // Calcular costo estimado para mostrarlo en la lista
    const costoEstimado = calcularCostoEstimado(material, cantidad, formData.unidadSeleccionada);

    // Evitar duplicados
    const existente = formData.materiales.find(m => m.materialId === id);
    if (existente) {
      toast.info("Este material ya está en la lista. Edítelo o quítelo.");
      return;
    }

    setFormData(prev => ({
        ...prev,
        materiales: [
            ...prev.materiales,
            {
                materialId: material.id,
                nombre: material.nombre,
                cantidadUsada: cantidad,
                unidadMedida: formData.unidadSeleccionada,
                stockDisponible: calcularStockDisponible(material),
                costoEstimado: costoEstimado, // Guardamos esto para mostrarlo
            }
        ],
        materialActual: '',
        cantidadMaterial: 1
    }));
  };

  const handleRemoveMaterial = (materialId: number) => {
    setFormData(prev => ({
        ...prev,
        materiales: prev.materiales.filter(m => m.materialId !== materialId)
    }));
  };
  // --- FIN DE LÓGICA DE MATERIALES ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.titulo ||
      !formData.fecha ||
      !formData.cultivo ||
      formData.aprendices.length === 0 ||
      (formData.aprendices.length > 1 && !formData.responsable)
    ) {
      toast.error(
        'Por favor, complete Título, Fecha, Cultivo y asigne al menos un Aprendiz. Si hay múltiples aprendices, seleccione un responsable.',
      );
      return;
    }

    // --- MODIFICACIÓN: Añadir materiales al payload ---
    const materialesPayload = formData.materiales.map(m => ({
        materialId: m.materialId,
        cantidadUsada: m.cantidadUsada,
        unidadMedida: m.unidadMedida
    }));

    const payload: AsignarActividadPayload = {
      titulo: formData.titulo,
      descripcion: formData.descripcion,
      fecha: formData.fecha,
      cultivo: Number(formData.cultivo),
      lote: formData.lote ? Number(formData.lote) : undefined,
      sublote: formData.sublote ? Number(formData.sublote) : undefined,
      aprendices: formData.aprendices,
      responsable: formData.responsable ? Number(formData.responsable) : undefined,
      materiales: materialesPayload, // <-- AÑADIDO
    };
    // --- FIN MODIFICACIÓN ---

    console.log("Payload que se enviará al backend:", JSON.stringify(payload, null, 2));

    setIsSubmitting(true);
    const toastId = toast.loading('Asignando actividades...');

    try {
      await asignarActividad(payload, formData.archivosIniciales || undefined);
      toast.success(`Actividades asignadas exitosamente.`, { id: toastId });
      onSuccess();
      onCancel();
    } catch (err: any) { // Capturar 'any' para acceder a 'response'
      // --- MODIFICACIÓN: Mostrar error del backend ---
      const errorMsg = err.response?.data?.message || 'Error al asignar las actividades.';
      toast.error(errorMsg, { id: toastId });
      // --- FIN MODIFICACIÓN ---
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna 1: Nueva Asignación (Formulario) */}
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50 max-h-[70vh] overflow-y-auto">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-green-600" /> Nueva Asignación
          </h2>

          {/* Input de Título */}
          <div>
            <Input
              type="text"
              name="titulo"
              placeholder="Ej: Riego por goteo - Lote A"
              value={formData.titulo}
              onChange={handleChange}
              label="Nombre de la Actividad"
              isRequired
            />
          </div>
          <div>
            <Select
              name="cultivo"
              selectedKeys={formData.cultivo ? [formData.cultivo] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];
                const cultivoSeleccionado = cultivos.find(c => c.id === Number(selected));
                const loteId = cultivoSeleccionado?.loteId;
                setFormData(prev => ({
                  ...prev,
                  cultivo: selected as string,
                  lote: loteId ? loteId.toString() : prev.lote,
                  sublote: ''
                }));
              }}
              label="Cultivo"
              placeholder="Seleccionar cultivo"
              isRequired
            >
              {cultivos.map(c => (
                <SelectItem key={c.id.toString()}>
                  {c.nombre}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div>
            <Select
              name="lote"
              selectedKeys={formData.lote ? [formData.lote] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];
                setFormData(prev => ({ ...prev, lote: selected as string, sublote: '' })); // Reset sublote when lote changes
              }}
              label="Lote (Opcional)"
              placeholder="Seleccionar lote"
            >
              {lotesDisponibles.map(l => (
                <SelectItem key={l.id.toString()}>
                  {l.nombre}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div>
            <Select
              name="sublote"
              selectedKeys={formData.sublote ? [formData.sublote] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];
                setFormData(prev => ({ ...prev, sublote: selected as string }));
              }}
              label="Sublote (Opcional)"
              placeholder="Seleccionar sublote"
              isDisabled={!formData.lote}
            >
              {sublotesDisponibles.map(s => (
                <SelectItem key={s.id.toString()}>
                  {s.nombre}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div>
            <Textarea
              name="descripcion"
              placeholder="Describe la tarea a realizar..."
              value={formData.descripcion}
              onChange={handleChange}
              label="Descripción de la Actividad"
              isRequired
              minRows={3}
            />
          </div>
          <div>
            <Input
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              label="Fecha de Realización"
              isRequired
            />
          </div>

          {/* --- AÑADIR CAMPO PARA ARCHIVOS INICIALES --- */}
          <div>
            <label htmlFor="archivosIniciales" className="block text-sm font-medium text-gray-700">
              Archivo Inicial (PDF, Excel, Imagen, etc.) - Opcional
            </label>
            <input
              type="file"
              name="archivosIniciales"
              id="archivosIniciales"
              multiple
              accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif"
              onChange={(e) => setFormData(prev => ({ ...prev, archivosIniciales: e.target.files }))}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Sube un archivo que los aprendices puedan descargar y usar como referencia para su respuesta.
            </p>
          </div>
          {/* --- FIN CAMPO ARCHIVOS --- */}

          {/* --- AÑADIR SECCIÓN DE MATERIALES --- */}
          <div className="space-y-3 pt-2">
            <label className="block text-sm font-medium text-gray-700">
              Materiales a Utilizar (cantidad total)
            </label>
            <div className="p-4 border rounded-lg bg-white space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    selectedKeys={formData.materialActual ? [formData.materialActual] : []}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0];
                      setFormData(prev => ({ ...prev, materialActual: selected as string }));
                    }}
                    placeholder="Seleccionar..."
                    label="Material"
                    startContent={<Package size={14} />}
                  >
                    {materialesDisponibles.map((m) => {
                      const stockTotal = calcularStockDisponible(m);
                      const unidadTexto = m.tipoConsumo === 'consumible' && m.cantidadPorUnidad ? (m.medidasDeContenido || 'unidades') : m.tipoEmpaque;
                      return (
                        <SelectItem key={m.id.toString()}>
                          {m.nombre} (Disp: {stockTotal} {unidadTexto})
                        </SelectItem>
                      );
                    })}
                  </Select>
                </div>
                <div className="w-1/4">
                  <Input
                    type="number"
                    value={formData.cantidadMaterial.toString()}
                    onChange={(e) => setFormData(prev => ({ ...prev, cantidadMaterial: Number(e.target.value) }))}
                    min="1"
                    label="Cantidad"
                    startContent={<Hash size={14} />}
                  />
                </div>
                <div className="w-1/4">
                  <Select
                    selectedKeys={[formData.unidadSeleccionada]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as UnidadMedida;
                      setFormData(prev => ({ ...prev, unidadSeleccionada: selected }));
                    }}
                    label="Unidad"
                    placeholder="Unidad"
                  >
                    {unidadesDisponibles.map((unidad) => (
                      <SelectItem key={unidad}>
                        {unidad}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <Button
                  type="button"
                  onClick={handleAddMaterial}
                  color="success"
                  isIconOnly
                >
                  <Plus size={20} />
                </Button>
              </div>

              {/* --- ZONA DE INFORMACIÓN DE STOCK DINÁMICO --- */}
              {materialSeleccionado && (
                <div className="w-full mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col gap-1">
                   <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 font-medium">Stock Disponible:</span>
                      <span className={`text-sm font-bold ${
                         Number(formData.cantidadMaterial) > stockEnUnidadSeleccionada
                         ? 'text-red-600'
                         : 'text-blue-600'
                      }`}>
                         {stockEnUnidadSeleccionada.toLocaleString('es-CO', { maximumFractionDigits: 2 })} {formData.unidadSeleccionada}
                      </span>
                   </div>

                   {/* Barra de progreso visual */}
                   <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                           Number(formData.cantidadMaterial) > stockEnUnidadSeleccionada ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min((Number(formData.cantidadMaterial) / (stockEnUnidadSeleccionada || 1)) * 100, 100)}%` }}
                      ></div>
                   </div>

                   <p className="text-xs text-gray-400 mt-1">
                     Total en inventario: {calcularStockDisponible(materialSeleccionado).toFixed(2)} {materialSeleccionado.unidadBase || 'g/ml'} (Base Unificada)
                   </p>
                </div>
              )}

              {/* --- FEEDBACK VISUAL PARA UNIDADES DE EMPAQUE --- */}
              {esUnidadEmpaque(formData.unidadSeleccionada) && materialSeleccionado?.pesoPorUnidad && (
                <div className="mt-2 p-2 bg-blue-50 text-blue-700 text-sm rounded border border-blue-200">
                  💡 <strong>Nota:</strong> Estás usando <strong>{formData.unidadSeleccionada}</strong>.
                  El sistema convertirá automáticamente a la unidad base para descontar del stock unificado.
                </div>
              )}

              <div className="space-y-2">
                {formData.materiales.map((m) => (
                  <div
                    key={m.materialId}
                    className="flex justify-between items-center bg-gray-100 p-2 border rounded-md"
                  >
                    <div className="text-sm">
                      <p className="font-medium text-gray-800">{m.nombre}</p>
                      <div className="flex gap-4 text-xs text-gray-600">
                         <span>Cant: <strong>{m.cantidadUsada} {m.unidadMedida}</strong></span>
                         {/* Mostramos el costo estimado */}
                         <span className="text-green-700 font-semibold">
                           Costo aprox: ${(m as any).costoEstimado?.toLocaleString('es-CO') || 0}
                         </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleRemoveMaterial(m.materialId)}
                      color="danger"
                      variant="light"
                      isIconOnly
                      size="sm"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* --- FIN DE SECCIÓN DE MATERIALES --- */}

          <div className="pt-2">
            <h3 className="text-sm font-medium text-gray-700">
              Asignar a Aprendices
            </h3>
            {formData.aprendices.length === 0 ? (
              <p className="text-sm text-red-500 mt-1">
                Debe seleccionar al menos un aprendiz.
              </p>
            ) : (
              <p className="text-sm text-green-600 mt-1">
                {formData.aprendices.length} Aprendiz(es) seleccionado(s).
              </p>
            )}
          </div>

          {formData.aprendices.length > 1 && (
            <div>
              <Select
                name="responsable"
                selectedKeys={formData.responsable ? [formData.responsable] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  setFormData(prev => ({ ...prev, responsable: selected }));
                }}
                label="Persona Responsable (Obligatorio cuando hay múltiples aprendices)"
                placeholder="Seleccionar responsable"
                isRequired={formData.aprendices.length > 1}
              >
                {usuarios
                  .filter(u => formData.aprendices.includes(Number(u.identificacion)))
                  .map(u => (
                    <SelectItem key={u.identificacion.toString()}>
                      {u.nombre} {u.apellidos}
                    </SelectItem>
                  ))}
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Esta persona podrá devolver materiales no utilizados al finalizar la actividad.
              </p>
            </div>
          )}

          <div className="flex justify-start gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || formData.aprendices.length === 0 || (formData.aprendices.length > 1 && !formData.responsable)}
                color="success"
                startContent={isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
              >
                {isSubmitting ? "Asignando..." : "Asignar Actividad"}
              </Button>
              <Button
                type="button"
                onClick={onCancel}
                color="danger"
              >
                Cancelar
              </Button>
          </div>
        </div>

        {/* Columna 2: Aprendices Disponibles (Lista de selección) */}
        <div className="p-4 border rounded-lg shadow-inner bg-white max-h-[70vh] overflow-y-auto">
          {/* ... (Controles de búsqueda y filtrado sin cambios) ... */}
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Aprendices Disponibles ({usuariosFiltrados.length} de {usuarios.length})
          </h2>
          
          <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <Input
              type="text"
              placeholder="Buscar por nombre o identificación..."
              value={formData.searchTerm}
              onChange={(e) => setFormData(prev => ({ ...prev, searchTerm: e.target.value }))}
              startContent={<Search className="w-4 h-4" />}
            />

            <Select
              selectedKeys={formData.selectedFicha ? [formData.selectedFicha] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];
                setFormData(prev => ({ ...prev, selectedFicha: selected as string }));
              }}
              placeholder="Todas las fichas"
              startContent={<Filter className="w-4 h-4" />}
            >
              {fichasUnicas.map(ficha => (
                <SelectItem key={ficha.id_ficha}>
                  {ficha.nombre} ({ficha.id_ficha})
                </SelectItem>
              ))}
            </Select>

            {formData.selectedFicha && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => seleccionarTodosDeFicha(formData.selectedFicha)}
                  color="success"
                  variant="light"
                  size="sm"
                  className="flex-1"
                >
                  Seleccionar Todo
                </Button>
                <Button
                  type="button"
                  onClick={() => deseleccionarTodosDeFicha(formData.selectedFicha)}
                  color="danger"
                  variant="light"
                  size="sm"
                  className="flex-1"
                >
                  Deseleccionar Todo
                </Button>
              </div>
            )}
          </div>
          
          {/* ... (Lista de aprendices filtrados sin cambios) ... */}
          <div className="space-y-2">
            {usuariosFiltrados.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No se encontraron aprendices con los filtros aplicados.
              </p>
            ) : (
              usuariosFiltrados
                .sort((a, b) => {
                  const fichaA = a.ficha?.nombre || '';
                  const fichaB = b.ficha?.nombre || '';
                  if (fichaA !== fichaB) {
                    return fichaA.localeCompare(fichaB);
                  }
                  return a.nombre.localeCompare(b.nombre);
                })
                .map(u => (
                  <div key={u.identificacion} className="border rounded-lg">
                    {u.ficha && (
                      <div className="bg-blue-50 px-3 py-2 border-b">
                        <p className="text-sm font-medium text-blue-800">
                          {u.ficha.nombre} ({u.ficha.id_ficha})
                        </p>
                      </div>
                    )}
                    
                    <label className="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          isSelected={formData.aprendices.includes(Number(u.identificacion))}
                          onValueChange={(isSelected) => handleAprendicesChange(Number(u.identificacion), isSelected)}
                        />
                        <div>
                          <p className="font-medium text-gray-800">{u.nombre} {u.apellidos}</p>
                          <p className="text-xs text-gray-500">ID: {u.identificacion}</p>
                        </div>
                      </div>
                      {formData.aprendices.includes(Number(u.identificacion)) && (
                          <UserCheck className="w-4 h-4 text-green-500" />
                      )}
                    </label>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default AsignacionActividadForm;