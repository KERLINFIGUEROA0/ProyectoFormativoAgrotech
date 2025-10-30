export interface Epa {
  id: number;
  nombre: string;
  descripcion: string;
  tipoEnfermedad: string; 
  img: string;
  
}

// ✅ Se añade la relación con Cultivo a la interfaz
export interface Tratamiento {
  id: number;
  descripcion: string;
  fechaInicio: string; 
  fechaFinal?: string;
  tipo: string; 
  estado: string; 
  // --- NUEVAS PROPIEDADES ---
  cultivoId?: number; // Para el formulario
  cultivo?: { // Para mostrar en la tabla
    id: number;
    nombre: string;
  };
}
