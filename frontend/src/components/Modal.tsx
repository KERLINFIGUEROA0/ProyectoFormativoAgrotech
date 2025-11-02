interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-0 duration-500 ease-out">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
        >
          ✕
        </button>
        <h2 className="text-center text-2xl font-bold mb-4 animate-in slide-in-from-top-2 duration-400 delay-100">{title}</h2>
        <div className="animate-in slide-in-from-bottom-2 duration-400 delay-150">
          {children}
        </div>
      </div>
    </div>
  );
}
