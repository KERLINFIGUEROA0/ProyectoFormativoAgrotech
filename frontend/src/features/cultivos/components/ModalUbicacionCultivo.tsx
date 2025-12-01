import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Chip } from "@heroui/react";
import { MapPin, Box, Grid3X3 } from "lucide-react";

interface ModalUbicacionProps {
  isOpen: boolean;
  onClose: () => void;
  cultivo: any; // O usa tu interfaz ICultivo
}

export default function ModalUbicacionCultivo({ isOpen, onClose, cultivo }: ModalUbicacionProps) {
  if (!cultivo) return null;

  const tieneSublotes = cultivo.sublotes && cultivo.sublotes.length > 0;

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <MapPin className="text-primary" />
            <span className="text-xl">Ubicación del Cultivo</span>
          </div>
          <span className="text-sm font-normal text-gray-500">
            {cultivo.nombre} - {cultivo.tipoCultivo?.nombre}
          </span>
        </ModalHeader>

        <ModalBody>
          <div className="flex flex-col gap-6">

            {/* SECCIÓN LOTE PRINCIPAL */}
            <div className="p-4 border rounded-xl bg-gray-50 border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Box size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Lote Principal</p>
                  <h3 className="text-lg font-bold text-gray-900">
                    {cultivo.lote?.nombre || "Sin Lote Asignado"}
                  </h3>
                </div>
              </div>
              <div className="pl-12">
                 <Chip color="primary" variant="flat" size="sm">
                    Area Total: {cultivo.lote?.area || 0} m²
                 </Chip>
              </div>
            </div>

            {/* SECCIÓN SUBLOTES (DETALLE) */}
            <div className="relative">
              <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-semibold text-gray-500">
                Distribución Específica
              </div>
              <div className="p-4 border border-dashed border-gray-300 rounded-xl">

                {!tieneSublotes ? (
                  // CASO 1: OCUPA TODO EL LOTE
                  <div className="text-center py-2">
                    <Grid3X3 className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-700 font-medium">Ocupación Total</p>
                    <p className="text-sm text-gray-500">
                      Este cultivo abarca la totalidad del terreno del lote principal.
                    </p>
                  </div>
                ) : (
                  // CASO 2: LISTA DE SUBLOTES
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Grid3X3 size={18} className="text-orange-500" />
                      <span className="font-medium text-gray-700">
                        Asignado a {cultivo.sublotes.length} Sublote(s):
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                      {cultivo.sublotes.map((sub: any) => (
                        <Chip
                          key={sub.id}
                          color="warning"
                          variant="flat"
                          startContent={<MapPin size={12}/>}
                        >
                          {sub.nombre}
                          {/* Indicador si es ubicación histórica (sublote eliminado) */}
                          {sub.deletedAt && (
                            <span className="ml-1 text-xs opacity-75">(Histórico)</span>
                          )}
                        </Chip>
                      ))}
                    </div>
                    {/* Mensaje informativo si hay sublotes históricos */}
                    {cultivo.sublotes.some((sub: any) => sub.deletedAt) && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-700">
                          <strong>Nota:</strong> Algunos sublotes marcados como "(Histórico)" fueron eliminados posteriormente.
                          Esta información se mantiene para preservar el registro de ubicación original del cultivo.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onPress={onClose}>
            Entendido
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}