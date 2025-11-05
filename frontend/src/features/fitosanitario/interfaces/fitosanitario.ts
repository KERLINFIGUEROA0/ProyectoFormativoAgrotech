export interface Epa {
  id: number;
  nombre: string;
  descripcion: string;
  tipoEnfermedad: string;
  img: string;
  // --- AÑADIR ESTOS CAMPOS OPCIONALES (VENDRÁN DEL BACKEND) ---
  fechaEncuentro?: string;
  deficiencias?: string;
  complicaciones?: string;
  // --- FIN DE CAMPOS ---
}


export interface EpaData {
  nombre: string;
  descripcion: string;
  tipoEnfermedad: string;
  fechaEncuentro: string; // La haremos requerida en el form
  imageFile?: File | null; // Para la subida
    complicaciones?: string;
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
