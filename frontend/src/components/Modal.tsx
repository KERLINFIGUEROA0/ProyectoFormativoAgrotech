interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    // Se añade padding (p-4) para que el modal no toque los bordes de la pantalla en móviles
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* --- ✅ CORRECCIÓN AQUÍ --- */}
      {/* Añadimos max-h-[95vh] para limitar la altura y overflow-y-auto para el scroll */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 relative max-h-[95vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4">✕</button>
        <h2 className="text-center text-2xl font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}