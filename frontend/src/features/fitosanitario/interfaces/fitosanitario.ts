export interface Epa {
  id: number;
  nombre: string;
  descripcion: string;
  tipoEnfermedad: string; 
  img: string;
  
}

export interface Tratamiento {
  id: number;
  descripcion: string;
  fechaInicio: string; 
  fechaFinal?: string;
  tipo: string; 
  estado: string; 
}