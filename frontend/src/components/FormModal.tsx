import React from "react";

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function FormModal({
  isOpen,
  onClose,
  title,
  children,
  icon,
  size = 'xl'
}: FormModalProps) {
  // Modal fullscreen flotante con scroll interno para formularios
  if (!isOpen) return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'max-w-md max-h-[60vh]';
      case 'md': return 'max-w-lg max-h-[70vh]';
      case 'lg': return 'max-w-2xl max-h-[80vh]';
      case 'xl': return 'max-w-4xl h-[85vh]';
      default: return 'max-w-4xl h-[85vh]';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-500 ease-out">
      <div className={`w-full ${getSizeClasses()} bg-white rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out`}>
        {/* Header fijo */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-blue-100 rounded-lg">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">Complete la información requerida</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Contenido con scroll interno */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {children}
          </div>
        </div>

        {/* Footer vacío - los botones van dentro del contenido del formulario */}
        <div className="flex-shrink-0 h-4 rounded-b-2xl"></div>
      </div>
    </div>
  );
}