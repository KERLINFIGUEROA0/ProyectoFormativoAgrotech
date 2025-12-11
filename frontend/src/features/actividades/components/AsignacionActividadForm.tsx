import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList,
  UserCheck,
  Search,
  Users,
  Package,
  Plus,
  X,
} from 'lucide-react';
// Importamos componentes de Hero UI para un diseño limpio
import {
  Input,
  Select,
  SelectItem,
  Button,
  Textarea,
  Checkbox,
  Card,
  CardBody,
  CardHeader,
  ScrollShadow,
  Chip,
} from '@heroui/react';

import {
   asignarActividad,
   obtenerMaterialesDisponibles,
   obtenerLotesParaActividades,
   obtenerSublotesParaActividades,
} from '../api/actividadesapi';
import type {
   AsignarActividadPayload,
   UsuarioSimple,
   CultivoSimple,
   LoteSimple,
   SubloteSimple,
   MaterialUsado,
} from '../interfaces/actividades';
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
    fecha: new Date().toLocaleDateString('en-CA'), // Formato YYYY-MM-DD para la zona horaria local
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
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      <div className="flex flex-col lg:flex-row gap-6 h-full">

        {/* === COLUMNA IZQUIERDA: FORMULARIO === */}
        <div className="flex-1 space-y-5 overflow-y-auto pr-2 scrollbar-hide">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-green-100 rounded-lg text-green-700">
                    <ClipboardList size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Detalles de la Actividad</h3>
            </div>

            <Input
              type="text"
              name="titulo"
              variant="bordered"
              label="Nombre de la Actividad"
              placeholder="Ej: Riego por goteo"
              value={formData.titulo}
              onChange={handleChange}
              isRequired
              classNames={{ inputWrapper: "bg-white" }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Cultivo"
                  variant="bordered"
                  placeholder="Seleccionar"
                  selectedKeys={formData.cultivo ? [formData.cultivo] : []}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    const cultivoSeleccionado = cultivos.find(c => c.id === Number(selected));
                    setFormData(prev => ({
                      ...prev,
                      cultivo: selected,
                      lote: cultivoSeleccionado?.loteId ? cultivoSeleccionado.loteId.toString() : prev.lote,
                      sublote: ''
                    }));
                  }}
                  isRequired
                  classNames={{ trigger: "bg-white" }}
                >
                  {cultivos.map(c => <SelectItem key={c.id.toString()}>{c.nombre}</SelectItem>)}
                </Select>

                <Input
                  type="date"
                  name="fecha"
                  variant="bordered"
                  label="Fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  isRequired
                  classNames={{ inputWrapper: "bg-white" }}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Select
                  label="Lote (Opcional)"
                  variant="bordered"
                  placeholder="Seleccionar lote"
                  selectedKeys={formData.lote ? [formData.lote] : []}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setFormData(prev => ({ ...prev, lote: selected, sublote: '' }));
                  }}
                  classNames={{ trigger: "bg-white" }}
                >
                  {lotesDisponibles.map(l => <SelectItem key={l.id.toString()}>{l.nombre}</SelectItem>)}
                </Select>

                <Select
                  label="Sublote (Opcional)"
                  variant="bordered"
                  placeholder="Seleccionar"
                  selectedKeys={formData.sublote ? [formData.sublote] : []}
                  onSelectionChange={(keys) => setFormData(prev => ({ ...prev, sublote: Array.from(keys)[0] as string }))}
                  isDisabled={!formData.lote}
                  classNames={{ trigger: "bg-white" }}
                >
                  {sublotesDisponibles.map(s => <SelectItem key={s.id.toString()}>{s.nombre}</SelectItem>)}
                </Select>
            </div>

            <Textarea
              name="descripcion"
              variant="bordered"
              label="Descripción"
              placeholder="Instrucciones detalladas..."
              value={formData.descripcion}
              onChange={handleChange}
              minRows={3}
              classNames={{ inputWrapper: "bg-white" }}
            />

            {/* SECCIÓN MATERIALES (Card limpia) */}
            <Card shadow="sm" className="border border-gray-100 bg-gray-50/50">
                <CardBody className="p-4 space-y-3">
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Package size={16}/> Materiales Necesarios
                    </span>

                    <div className="flex gap-2 items-end">
                         <Select
                            className="flex-1"
                            label="Material"
                            size="sm"
                            selectedKeys={formData.materialActual ? [formData.materialActual] : []}
                            onSelectionChange={(k) => setFormData(prev => ({ ...prev, materialActual: Array.from(k)[0] as string }))}
                         >
                            {materialesDisponibles.map((m) => (
                                <SelectItem key={m.id.toString()} textValue={m.nombre}>
                                    {m.nombre} (Disp: {Math.round(m.cantidad)})
                                </SelectItem>
                            ))}
                         </Select>
                         <Input
                            className="w-24"
                            type="number"
                            label="Cant."
                            size="sm"
                            value={formData.cantidadMaterial.toString()}
                            onChange={(e) => setFormData(prev => ({ ...prev, cantidadMaterial: Number(e.target.value) }))}
                         />
                         <Select
                            className="w-28"
                            label="Unidad"
                            size="sm"
                            selectedKeys={[formData.unidadSeleccionada]}
                            onSelectionChange={(k) => setFormData(prev => ({ ...prev, unidadSeleccionada: Array.from(k)[0] as UnidadMedida }))}
                         >
                            {unidadesDisponibles.map(u => <SelectItem key={u}>{u}</SelectItem>)}
                         </Select>
                         <Button isIconOnly color="success" size="lg" onClick={handleAddMaterial}>
                            <Plus size={20} />
                         </Button>
                    </div>

                    {/* Información de Stock y Costo */}
                    {materialSeleccionado && (
                        <div className="w-full mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-blue-700 font-medium">Stock Disponible:</span>
                              <span className={`text-sm font-bold ${
                                 Number(formData.cantidadMaterial) > stockEnUnidadSeleccionada
                                 ? 'text-red-600'
                                 : 'text-blue-600'
                              }`}>
                                 {stockEnUnidadSeleccionada.toLocaleString('es-CO', { maximumFractionDigits: 2 })} {formData.unidadSeleccionada}
                              </span>
                           </div>

                           {/* Barra de progreso visual */}
                           <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                   Number(formData.cantidadMaterial) > stockEnUnidadSeleccionada ? 'bg-red-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min((Number(formData.cantidadMaterial) / (stockEnUnidadSeleccionada || 1)) * 100, 100)}%` }}
                              ></div>
                           </div>

                           <div className="flex justify-between text-xs text-blue-600">
                              <span>Total en inventario: {calcularStockDisponible(materialSeleccionado).toFixed(2)} {materialSeleccionado.unidadBase || 'g/ml'}</span>
                              {Number(formData.cantidadMaterial) > 0 && (
                                 <span className="font-semibold text-green-600">
                                    Costo aprox: ${calcularCostoEstimado(materialSeleccionado, Number(formData.cantidadMaterial), formData.unidadSeleccionada).toLocaleString('es-CO')}
                                 </span>
                              )}
                           </div>
                        </div>
                    )}

                    {/* Nota para unidades de empaque */}
                    {esUnidadEmpaque(formData.unidadSeleccionada) && materialSeleccionado?.pesoPorUnidad && (
                        <div className="mt-2 p-2 bg-amber-50 text-amber-700 text-sm rounded border border-amber-200">
                          💡 <strong>Nota:</strong> Estás usando <strong>{formData.unidadSeleccionada}</strong>.
                          El sistema convertirá automáticamente a la unidad base para descontar del stock unificado.
                        </div>
                    )}

                    {/* Lista Materiales Agregados */}
                    <div className="space-y-2 mt-3">
                        {formData.materiales.map((m) => (
                            <div key={m.materialId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{m.nombre}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                                        <span>Cantidad: <strong>{m.cantidadUsada} {m.unidadMedida}</strong></span>
                                        <span className="text-green-600 font-semibold">
                                            Costo: ${(m as any).costoEstimado?.toLocaleString('es-CO') || 0}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    isIconOnly
                                    color="danger"
                                    variant="light"
                                    size="sm"
                                    onClick={() => handleRemoveMaterial(m.materialId)}
                                >
                                    <X size={16} />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardBody>
            </Card>

             {/* Archivos */}
             <div className="p-3 border border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-white transition-colors">
                <label className="cursor-pointer flex items-center gap-3 w-full">
                    <span className="p-2 bg-blue-100 text-blue-600 rounded-full"><ClipboardList size={18}/></span>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">Adjuntar Archivo Guía</p>
                        <p className="text-xs text-gray-500">PDF, Excel o Imagen (Opcional)</p>
                    </div>
                    <input type="file" className="hidden" onChange={(e) => setFormData(prev => ({ ...prev, archivosIniciales: e.target.files }))} />
                </label>
                {formData.archivosIniciales && <p className="text-xs text-green-600 mt-2 ml-12">Archivo seleccionado</p>}
             </div>
        </div>

        {/* === COLUMNA DERECHA: SELECCIÓN DE APRENDICES === */}
        <Card className="flex-1 h-full shadow-sm border border-gray-200">
            <CardHeader className="px-4 py-3 border-b border-gray-100 bg-gray-50/30 flex flex-col gap-3">
                <div className="flex justify-between items-center w-full">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Users size={18} className="text-blue-500"/> Aprendices
                    </h3>
                    <Chip size="sm" variant="flat" color={formData.aprendices.length > 0 ? "success" : "default"}>
                        {formData.aprendices.length} Seleccionados
                    </Chip>
                </div>

                <div className="flex gap-2 w-full">
                     <Input
                        size="sm"
                        placeholder="Buscar..."
                        startContent={<Search size={14}/>}
                        value={formData.searchTerm}
                        onChange={(e) => setFormData(prev => ({...prev, searchTerm: e.target.value}))}
                        classNames={{ inputWrapper: "bg-white" }}
                     />
                     <Select
                        size="sm"
                        placeholder="Ficha"
                        className="w-32"
                        selectedKeys={formData.selectedFicha ? [formData.selectedFicha] : []}
                        onSelectionChange={(k) => setFormData(prev => ({...prev, selectedFicha: Array.from(k)[0] as string}))}
                     >
                        {fichasUnicas.map(f => <SelectItem key={f.id_ficha}>{f.id_ficha}</SelectItem>)}
                     </Select>
                </div>
                {formData.selectedFicha && (
                     <div className="flex gap-2 w-full">
                        <Button size="sm" fullWidth color="primary" variant="flat" onClick={() => seleccionarTodosDeFicha(formData.selectedFicha)}>Todos</Button>
                        <Button size="sm" fullWidth color="danger" variant="flat" onClick={() => deseleccionarTodosDeFicha(formData.selectedFicha)}>Ninguno</Button>
                     </div>
                )}
            </CardHeader>

            <CardBody className="p-0 overflow-hidden">
                <ScrollShadow className="h-[400px] lg:h-[500px] w-full p-2">
                    <div className="space-y-1">
                        {usuariosFiltrados.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                <Users size={32} strokeWidth={1.5} />
                                <p className="text-sm mt-2">No hay aprendices</p>
                            </div>
                        ) : (
                            usuariosFiltrados.map((u) => {
                                const isSelected = formData.aprendices.includes(Number(u.identificacion));
                                return (
                                    <div
                                        key={u.identificacion}
                                        onClick={() => handleAprendicesChange(Number(u.identificacion), !isSelected)}
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${
                                            isSelected
                                            ? "bg-green-50 border-green-200"
                                            : "bg-white border-transparent hover:bg-gray-50"
                                        }`}
                                    >
                                        <Checkbox isSelected={isSelected} color="success" className="pointer-events-none" />
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium ${isSelected ? "text-green-800" : "text-gray-700"}`}>
                                                {u.nombre} {u.apellidos}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {u.ficha?.id_ficha || "Sin ficha"} • ID: {u.identificacion}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollShadow>
            </CardBody>

            {/* Footer de Responsable (Si hay múltiples) */}
            {formData.aprendices.length > 1 && (
                <div className="p-3 bg-yellow-50 border-t border-yellow-100 animate-in slide-in-from-bottom-2">
                     <Select
                        label="Responsable del Grupo"
                        placeholder="¿Quién entrega materiales?"
                        size="sm"
                        color="warning"
                        variant="flat"
                        selectedKeys={formData.responsable ? [formData.responsable] : []}
                        onSelectionChange={(k) => setFormData(prev => ({ ...prev, responsable: Array.from(k)[0] as string }))}
                        startContent={<UserCheck size={16}/>}
                     >
                        {usuarios
                          .filter(u => formData.aprendices.includes(Number(u.identificacion)))
                          .map(u => <SelectItem key={u.identificacion.toString()}>{u.nombre} {u.apellidos}</SelectItem>)
                        }
                     </Select>
                </div>
            )}
        </Card>
      </div>

      {/* === ACCIONES FINALES === */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
         <Button
            variant="light"
            color="default"
            onClick={onCancel}
            className="font-semibold text-gray-600 hover:bg-gray-100"
         >
            Cancelar
         </Button>
         <Button
            color="success"
            className="font-bold text-white shadow-lg shadow-green-200"
            isLoading={isSubmitting}
            onClick={handleSubmit}
         >
            Asignar Actividad
         </Button>
      </div>
    </form>
  );
};

export default AsignacionActividadForm;