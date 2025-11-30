import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../components/Modal'; // Ajustar ruta según tu estructura
import { obtenerLotes } from '../../cultivos/api/lotesApi';
import { obtenerSublotesPorLote } from '../../cultivos/api/sublotesApi';
import { descargarReporteApi } from '../api/sensoresApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ModalDescargarTrazabilidad: React.FC<Props> = ({ isOpen, onClose }) => {
  const { register, handleSubmit, watch } = useForm();
  const [lotes, setLotes] = useState([]);
  const [sublotes, setSublotes] = useState([]);
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

      if (payload.formato === 'json') {
        // Mostrar datos JSON
        console.log('Datos del reporte:', result);
        alert('Datos obtenidos correctamente. Revisa la consola para ver los datos JSON.');
        onClose();
      } else {
        // Descargar archivo
        const url = window.URL.createObjectURL(new Blob([result]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `trazabilidad_${payload.loteId}.${payload.formato}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        onClose();
      }
    } catch (error: any) {
      console.error("Error generando reporte", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Error desconocido";
      alert("Error al generar el reporte: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Descargar Trazabilidad Completa">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">

        {/* Formato */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Formato</label>
          <select {...register('formato')} className="mt-1 block w-full border rounded-md p-2">
            <option value="json">JSON (Para Testing)</option>
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
            {loading ? 'Generando Reporte...' : 'Descargar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalDescargarTrazabilidad;