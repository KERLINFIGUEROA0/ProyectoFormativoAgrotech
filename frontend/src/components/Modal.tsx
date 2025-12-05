interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = '2xl',
}: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-0 duration-500 ease-out">
      <div className={`w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
        >
          ✕
        </button>
        <h2 className="text-center text-2xl font-bold mb-4 animate-in slide-in-from-top-2 duration-400 delay-100">{title}</h2>
        <div className="animate-in slide-in-from-bottom-2 duration-400 delay-150 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
