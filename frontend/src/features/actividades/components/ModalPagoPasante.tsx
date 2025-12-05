import React, { useState, useEffect } from 'react';
import { DollarSign, Clock, Calculator } from 'lucide-react';
import { Button, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { toast } from 'sonner';
import type { Actividad } from '../interfaces/actividades';
import { registrarPagosPasantes } from '../api/actividadesapi';

interface ModalPagoPasanteProps {
  actividad: Actividad;
  isOpen: boolean;
  onClose: () => void;
  onPagoSuccess: () => void;
  pasantes: Array<{
    identificacion: number;
    nombre: string;
    apellidos: string;
  }>;
}

interface PagoData {
  idUsuario: number;
  horasTrabajadas: number;
  tarifaHora: number;
  descripcion: string;
}

const ModalPagoPasante: React.FC<ModalPagoPasanteProps> = ({
  actividad,
  isOpen,
  onClose,
  onPagoSuccess,
  pasantes,
}) => {
  console.log('🎯 ModalPagoPasante renderizado:', { isOpen, pasantesCount: pasantes.length, actividad: actividad?.titulo });

  const [pagos, setPagos] = useState<PagoData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log('🔄 useEffect ModalPagoPasante:', { isOpen, pasantesLength: pasantes.length, actividadId: actividad?.id });
    if (isOpen && pasantes.length > 0) {
      // Inicializar pagos para cada pasante
      const pagosIniciales = pasantes.map(pasante => ({
        idUsuario: pasante.identificacion,
        horasTrabajadas: actividad.horas || 0,
        tarifaHora: actividad.tarifaHora || 0,
        descripcion: `Pago por actividad: ${actividad.titulo}`,
      }));
      console.log('💰 Inicializando pagos:', pagosIniciales);
      setPagos(pagosIniciales);
    }
  }, [isOpen, pasantes, actividad]);

  const handlePagoChange = (index: number, field: keyof PagoData, value: string | number) => {
    const nuevosPagos = [...pagos];
    nuevosPagos[index] = {
      ...nuevosPagos[index],
      [field]: value,
    };
    setPagos(nuevosPagos);
  };

  const calcularMonto = (horas: number, tarifa: number) => {
    return horas * tarifa;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pagos.length === 0) {
      toast.error('No hay pasantes para pagar');
      return;
    }

    // Validar que todos los campos requeridos estén completos
    for (const pago of pagos) {
      if (!pago.horasTrabajadas || !pago.tarifaHora) {
        toast.error('Todos los campos de horas y tarifa son requeridos');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Preparar datos de pagos para enviar a la API
      const pagosData = pagos.map(pago => ({
        idUsuario: pago.idUsuario,
        idActividad: actividad.id,
        monto: calcularMonto(pago.horasTrabajadas, pago.tarifaHora),
        horasTrabajadas: pago.horasTrabajadas,
        tarifaHora: pago.tarifaHora,
        descripcion: pago.descripcion,
        fechaPago: new Date().toISOString().split('T')[0],
      }));

      console.log('💰 Enviando pagos:', pagosData);

      // Registrar pagos usando la API
      await registrarPagosPasantes(pagosData);

      toast.success('Pagos registrados exitosamente');
      onPagoSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error al registrar pagos:', error);
      const errorMessage = error.response?.data?.message || 'Error al registrar los pagos';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Registrar Pagos - {actividad.titulo}
          </h2>
        </ModalHeader>

        <ModalBody>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Actividad completada:</strong> Registra los pagos por horas trabajadas para los pasantes que participaron.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {pasantes.map((pasante, index) => {
                const pago = pagos[index];
                if (!pago) return null;

                return (
                  <div key={pasante.identificacion} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      {pasante.nombre} {pasante.apellidos}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Input
                          type="number"
                          label="Horas Trabajadas"
                          value={pago.horasTrabajadas.toString()}
                          onChange={(e) => handlePagoChange(index, 'horasTrabajadas', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.5"
                          startContent={<Clock className="w-4 h-4" />}
                          isRequired
                        />
                      </div>

                      <div>
                        <Input
                          type="number"
                          label="Tarifa por Hora ($)"
                          value={pago.tarifaHora.toString()}
                          onChange={(e) => handlePagoChange(index, 'tarifaHora', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          startContent={<DollarSign className="w-4 h-4" />}
                          isRequired
                        />
                      </div>

                      <div>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              Total: ${calcularMonto(pago.horasTrabajadas, pago.tarifaHora).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Textarea
                        label="Descripción del Pago"
                        value={pago.descripcion}
                        onChange={(e) => handlePagoChange(index, 'descripcion', e.target.value)}
                        placeholder="Descripción del trabajo realizado..."
                        rows={2}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </form>
        </ModalBody>

        <ModalFooter>
          <Button
            onClick={onClose}
            color="danger"
            variant="light"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            color="success"
            startContent={isSubmitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <DollarSign className="w-4 h-4" />}
          >
            {isSubmitting ? 'Registrando Pagos...' : 'Registrar Pagos'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ModalPagoPasante;