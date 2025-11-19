import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getLatestSensorData } from '../features/iot/api/sensoresApi';
import type { LatestSensorData } from '../features/iot/interfaces/iot';

interface MonitoringContextType {
  isPaused: boolean;
  togglePause: () => void;
  latestData: LatestSensorData[];
  generalHistory: { time: string; [key: string]: any }[];
  lastUpdate: Date | null;
  filtroId: number | 'TODOS';
  setFiltroId: (id: number | 'TODOS') => void;
  modoVista: 'GENERAL' | 'CULTIVO' | 'SURCO';
  setModoVista: (modo: 'GENERAL' | 'CULTIVO' | 'SURCO') => void;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

export const MonitoringProvider = ({ children }: { children: ReactNode }) => {
  // 1. ESTADOS GLOBALES
  const [isPaused, setIsPaused] = useState<boolean>(true); // Inicia pausado
  const [latestData, setLatestData] = useState<LatestSensorData[]>([]);
  const [generalHistory, setGeneralHistory] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Filtros
  const [filtroId, setFiltroId] = useState<number | 'TODOS'>('TODOS');
  const [modoVista, setModoVista] = useState<'GENERAL' | 'CULTIVO' | 'SURCO'>('GENERAL');

  // ✅ NUEVO: Función auxiliar para cargar datos (Reutilizable)
  const fetchAndSetData = async () => {
    try {
      // console.log("📡 Obteniendo datos...");
      const datos = await getLatestSensorData();
      const timestamp = new Date();
      
      setLatestData(datos || []);
      setLastUpdate(timestamp);

      // Actualizar historial para gráficas
      const newEntry: any = { 
        time: timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) 
      };
      (datos || []).forEach((d) => { if (d.valor != null) newEntry[d.id] = d.valor; });
      
      setGeneralHistory(prev => {
        const h = [...prev, newEntry];
        return h.length > 30 ? h.slice(1) : h;
      });
    } catch (error) {
      console.error("Error obteniendo datos:", error);
    }
  };

  // ✅ SOLUCIÓN 1: Carga Inicial INMEDIATA (Snapshot)
  // Se ejecuta UNA VEZ al cargar la página, ignorando si está pausado o no.
  useEffect(() => {
    fetchAndSetData();
  }, []);

  // 2. LÓGICA DE POLLING (Ciclo de vida)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    // Solo activar el ciclo automático si NO está pausado
    if (!isPaused) {
      // Opcional: Hacer una carga inmediata al dar Play
      fetchAndSetData();
      
      // Iniciar el intervalo
      intervalId = setInterval(fetchAndSetData, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPaused]); // Dependencia solo de isPaused (y no de filtroId para mantener datos de fondo si se requiere)

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  return (
    <MonitoringContext.Provider value={{ 
      isPaused, 
      togglePause, 
      latestData, 
      generalHistory, 
      lastUpdate,
      filtroId,
      setFiltroId,
      modoVista,
      setModoVista
    }}>
      {children}
    </MonitoringContext.Provider>
  );
};

export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (!context) throw new Error("useMonitoring debe usarse dentro de MonitoringProvider");
  return context;
};
