import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea } from '@heroui/react';

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

  const handleSubmit = async () => {
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

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="md">
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={24} />
            <h2 className="text-xl font-bold text-red-600">Rechazar Respuesta</h2>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Importante:</strong> Al rechazar esta respuesta, el aprendiz podrá editarla y enviarla nuevamente.
              Proporcione un comentario constructivo explicando las razones del rechazo.
            </p>
          </div>

          <div className="mb-4">
            <Textarea
              label="Comentario de rechazo"
              placeholder="Explique las razones del rechazo y qué debe corregir el aprendiz..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              isRequired
              minRows={4}
              description="Este comentario ayudará al aprendiz a mejorar su respuesta."
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="light"
            onPress={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            color="danger"
            onPress={handleSubmit}
            disabled={isSubmitting || !comentario.trim()}
          >
            {isSubmitting ? 'Rechazando...' : 'Rechazar Respuesta'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ModalComentarioRechazo;