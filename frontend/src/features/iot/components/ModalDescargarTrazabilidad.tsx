import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../components/Modal'; // Ajustar ruta según tu estructura
import { obtenerLotes } from '../../cultivos/api/lotesApi';
import { obtenerSublotesPorLote } from '../../cultivos/api/sublotesApi';
import { descargarReporteApi, getCultivosActivosLote } from '../api/sensoresApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ModalDescargarTrazabilidad: React.FC<Props> = ({ isOpen, onClose }) => {
  const { register, handleSubmit, watch } = useForm();
  const [lotes, setLotes] = useState([]);
  const [sublotes, setSublotes] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectedLoteId = watch('loteId');

  useEffect(() => {
    if (isOpen) {
      // Cargar Lotes al abrir
      obtenerLotes().then(response => setLotes(response.data || []));
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedLoteId) {
      // Cargar sublotes si selecciona lote
      obtenerSublotesPorLote(selectedLoteId).then(response => setSublotes(response.data?.data || []));
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
      setSublotes([]);
      setCultivos([]);
    }
  }, [selectedLoteId]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Preparar datos para enviar
      const payload = {
        formato: data.formato,
        loteId: Number(data.loteId),
        subloteId: data.subloteId && data.subloteId !== "" ? Number(data.subloteId) : undefined,
        cultivoId: data.cultivoId && data.cultivoId !== "" ? Number(data.cultivoId) : undefined,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
      };

      // Remover subloteId si es undefined
      if (payload.subloteId === undefined) {
        delete payload.subloteId;
      }

      console.log("Enviando datos:", payload);

      // Llamada a la API
      const result = await descargarReporteApi(payload);

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
      onClose();
    } catch (error: any) {
      console.error("Error generando reporte", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Error desconocido";
      alert("Error al generar el reporte: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  console.log('Modal renderizando, cultivos:', cultivos, 'loteId:', selectedLoteId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Descargar Reporte de Trazabilidad">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">

        {/* Formato */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Formato</label>
          <select {...register('formato')} className="mt-1 block w-full border rounded-md p-2">
            <option value="pdf">PDF (Reporte Completo)</option>
            <option value="excel">Excel (Datos Crudos)</option>
          </select>
        </div>

        {/* Selección de Lote */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Lote</label>
          <select {...register('loteId', { required: true })} className="mt-1 block w-full border rounded-md p-2">
            <option value="">Seleccione un lote...</option>
            {lotes.map((l: any) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </div>

        {/* Sublote Opcional */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Sublote (Opcional)</label>
          <select {...register('subloteId')} className="mt-1 block w-full border rounded-md p-2">
            <option value="">Todo el lote</option>
            {sublotes.map((s: any) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        {/* CULTIVO ESPECÍFICO - ESTE ES EL INPUT QUE BUSCAS */}
        <div className="border-2 border-blue-200 bg-blue-50 p-4 rounded-lg">
          <label className="block text-sm font-medium text-blue-800 mb-2">
            🎯 Cultivo Específico (Opcional)
          </label>
          <select
            {...register('cultivoId')}
            className="mt-1 block w-full border border-blue-300 rounded-md p-2 bg-white"
            disabled={!selectedLoteId}
          >
            <option value="">📊 Todos los cultivos del lote</option>
            {cultivos.length > 0 ? cultivos.map((c: any) => (
              <option key={c.id} value={c.id}>
                🌱 {c.nombre} {c.tipoCultivo?.nombre ? `(${c.tipoCultivo.nombre})` : ''}
                {c.sublotes?.nombre ? ` - 📍 Sublote: ${c.sublotes.nombre}` : ''}
              </option>
            )) : (
              <option disabled>⏳ Cargando cultivos...</option>
            )}
          </select>
          <small className="text-blue-600 mt-2 block font-medium">
            💡 Solo muestra cultivos activos (no finalizados) con producción pendiente.
            <br />
            📈 {cultivos.length} cultivo(s) encontrado(s) en este lote.
          </small>
        </div>

        {/* Rango de Fechas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
            <input type="date" {...register('fechaInicio', { required: true })} className="mt-1 block w-full border rounded-md p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha Fin</label>
            <input type="date" {...register('fechaFin', { required: true })} className="mt-1 block w-full border rounded-md p-2" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? 'Generando Reporte...' : 'Generar Reporte'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalDescargarTrazabilidad;