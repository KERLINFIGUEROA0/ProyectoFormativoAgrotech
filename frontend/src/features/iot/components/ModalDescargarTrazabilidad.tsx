import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input, Select, SelectItem, Button, Progress } from "@heroui/react";
import Modal from '../../../components/Modal'; // Ajustar ruta según tu estructura
import { obtenerLotes } from '../../cultivos/api/lotesApi';
import { descargarReporteApi, getCultivosActivosLote } from '../api/sensoresApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ModalDescargarTrazabilidad: React.FC<Props> = ({ isOpen, onClose }) => {
  const { register, handleSubmit, setValue } = useForm();
  const [lotes, setLotes] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFormato, setSelectedFormato] = useState('pdf');
  const [selectedLoteId, setSelectedLoteId] = useState<number | null>(null);
  const [selectedCultivoId, setSelectedCultivoId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Cargar Lotes al abrir
      obtenerLotes().then(response => setLotes(response.data || []));
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedLoteId) {
      // Cargar cultivos activos del lote
      getCultivosActivosLote(selectedLoteId).then(response => {
        console.log('Cultivos cargados:', response.data);
        setCultivos(response.data || []);
      }).catch(error => {
        console.error('Error cargando cultivos:', error);
        setCultivos([]);
      });
    } else {
      // Limpiar cuando no hay lote seleccionado
      setCultivos([]);
    }
  }, [selectedLoteId]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    setProgress(0);

    try {
      // Preparar datos para enviar
      const payload = {
        formato: selectedFormato as "pdf"  | "json",
        loteId: selectedLoteId!,
        cultivoId: selectedCultivoId || undefined,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
      };

      console.log("Enviando datos:", payload);

      // Simular progreso gradual durante la recolección de datos
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 300));

      setProgress(20);
      await new Promise(resolve => setTimeout(resolve, 300));

      setProgress(30);
      await new Promise(resolve => setTimeout(resolve, 300));

      setProgress(40);
      await new Promise(resolve => setTimeout(resolve, 300));

      setProgress(50);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Llamada a la API (aquí es donde realmente se procesa)
      const result = await descargarReporteApi(payload);

      setProgress(60);
      await new Promise(resolve => setTimeout(resolve, 200));

      setProgress(70);
      await new Promise(resolve => setTimeout(resolve, 200));

      setProgress(80);
      // Esperar un poco más en 80% para simular procesamiento final
      await new Promise(resolve => setTimeout(resolve, 800));

      setProgress(90);

      // Descargar archivo
      const url = window.URL.createObjectURL(new Blob([result]));
      const link = document.createElement('a');
      link.href = url;
      const filename = payload.cultivoId
        ? `trazabilidad_cultivo_${payload.cultivoId}.${payload.formato}`
        : `trazabilidad_lote_${payload.loteId}.${payload.formato}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);

      link.click();
      link.remove();

      setProgress(100);

      // Pequeño delay para mostrar el 100%
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (error: any) {
      console.error("Error generando reporte", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Error desconocido";
      alert("Error al generar el reporte: " + errorMessage);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  console.log('Modal renderizando, cultivos:', cultivos, 'loteId:', selectedLoteId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Descargar Reporte de Trazabilidad">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">

        {/* Formato */}
        <div>
          <Select
            label="Formato"
            selectedKeys={[selectedFormato]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys);
              setSelectedFormato(String(selected[0]));
            }}
            fullWidth
          >
            <SelectItem key="pdf">PDF (Reporte Completo)</SelectItem>
          </Select>
        </div>

        {/* Selección de Lote */}
        <div>
          <Select
            label="Lote"
            selectedKeys={selectedLoteId ? [selectedLoteId.toString()] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys);
              const value = selected.length > 0 ? Number(selected[0]) : null;
              setSelectedLoteId(value);
              setSelectedCultivoId(null); // Reset cultivo
            }}
            placeholder="Seleccione un lote..."
            fullWidth
            required
          >
            {lotes.map((l: any) => (
              <SelectItem key={l.id.toString()}>{l.nombre}</SelectItem>
            ))}
          </Select>
        </div>


        {/* CULTIVO ESPECÍFICO - ESTE ES EL INPUT QUE BUSCAS */}
        <div className="border-2 border-blue-200 bg-blue-50 p-4 rounded-lg">
          <Select
            label="Cultivo Específico (Opcional)"
            selectedKeys={selectedCultivoId ? [selectedCultivoId.toString()] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys);
              setSelectedCultivoId(selected.length > 0 ? Number(selected[0]) : null);
            }}
            placeholder="Todos los cultivos del lote"
            fullWidth
            disabled={!selectedLoteId}
            className="bg-white"
          >
            {cultivos.length > 0 ? cultivos.map((c: any) => (
              <SelectItem key={c.id.toString()}>
                {c.nombre} {c.tipoCultivo?.nombre ? `(${c.tipoCultivo.nombre})` : ''}
                {c.sublotes?.nombre ? ` - Sublote: ${c.sublotes.nombre}` : ''}
              </SelectItem>
            )) : (
              <SelectItem key="loading" isDisabled>Cargando cultivos...</SelectItem>
            )}
          </Select>
          <small className="text-blue-600 mt-2 block font-medium">
            Solo muestra cultivos activos (no finalizados) con producción pendiente.
            <br />
            {cultivos.length} cultivo(s) encontrado(s) en este lote.
          </small>
        </div>

        {/* Rango de Fechas */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Fecha Inicio"
            type="date"
            {...register('fechaInicio', { required: true })}
            fullWidth
          />
          <Input
            label="Fecha Fin"
            type="date"
            {...register('fechaFin', { required: true })}
            fullWidth
          />
        </div>

        {/* Barra de Progreso */}
        {loading && (
          <div className="mt-4">
            <Progress
              value={progress}
              color="success"
              size="md"
              className="w-full"
              label={`Generando reporte... ${progress}%`}
            />
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            color="success"
            disabled={loading}
          >
            {loading ? 'Generando Reporte...' : 'Generar Reporte'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalDescargarTrazabilidad;