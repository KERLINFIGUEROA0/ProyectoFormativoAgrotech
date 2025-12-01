import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ModalComentarioRechazoProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comentario: string) => void;
}

const ModalComentarioRechazo: React.FC<ModalComentarioRechazoProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [comentario, setComentario] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentario.trim()) {
      alert('Debe proporcionar un comentario para el rechazo.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(comentario);
      setComentario('');
      onClose();
    } catch (error) {
      console.error('Error al rechazar respuesta:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={24} />
            <h2 className="text-xl font-bold text-red-600">Rechazar Respuesta</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            <strong>Importante:</strong> Al rechazar esta respuesta, el aprendiz podrá editarla y enviarla nuevamente.
            Proporcione un comentario constructivo explicando las razones del rechazo.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Comentario de rechazo *
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={4}
              placeholder="Explique las razones del rechazo y qué debe corregir el aprendiz..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Este comentario ayudará al aprendiz a mejorar su respuesta.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !comentario.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Rechazando...' : 'Rechazar Respuesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalComentarioRechazo;