// src/features/cultivos/components/LotesMap.tsx

import { type ReactElement, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Polygon,
  InfoWindow,
  Marker,
} from "@react-google-maps/api";
import type { Coordenada, Lote } from '../interfaces/cultivos';
import websocketService from '../../../services/websocket.service';


interface SubloteConCultivo {
  id: number;
  nombre: string;
  coordenadas?: any;
  cultivo: {
    id: number;
    nombre: string;
    tipoCultivo?: { nombre: string };
    estado: string;
  };
  lote?: Lote;
}

interface LotesMapProps {
  lotes: Lote[];
  selectedLote: Lote | null;
  onSelectLote: (lote: Lote | null) => void;
  customInfo?: (lote: Lote) => ReactElement;
  sublotesConCultivos?: SubloteConCultivo[];
  selectedSubloteCultivo?: SubloteConCultivo | null;
  onSelectSubloteCultivo?: (sublote: SubloteConCultivo | null) => void;
  onLotesUpdate?: (lotes: Lote[]) => void; // Callback para actualizar lotes en tiempo real
  onSublotesUpdate?: (sublotes: SubloteConCultivo[]) => void; // Callback para actualizar sublotes en tiempo real
}

const containerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "1.5rem",
};

const initialCenter = {
  lat: 4.5709,
  lng: -74.2973,
};

const getPolygonCenter = (coords: Coordenada[]): Coordenada => {
  // Esta función ahora solo se llamará cuando 'window.google' esté listo
  const bounds = new window.google.maps.LatLngBounds();
  coords.forEach((coord) => {
    bounds.extend(new window.google.maps.LatLng(coord.lat, coord.lng));
  });
  const center = bounds.getCenter();
  return { lat: center.lat(), lng: center.lng() };
};

const libraries: ['geometry'] = ['geometry']; 

export default function LotesMap({
  lotes,
  selectedLote,
  onSelectLote,
  customInfo,
  sublotesConCultivos = [],
  selectedSubloteCultivo,
  onSelectSubloteCultivo,
  onLotesUpdate,
  onSublotesUpdate,
}: LotesMapProps): ReactElement {
  // Parse coordenadas if they are strings
  const parsedLotes = lotes.map(lote => ({
    ...lote,
    coordenadas: typeof lote.coordenadas === 'string'
      ? JSON.parse(lote.coordenadas)
      : lote.coordenadas
  }));
  console.log('Lotes en LotesMap:', parsedLotes);
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: libraries,
  });
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    // CORRECCIÓN 1: Condicionamos la ejecución a que isLoaded sea true
    if (isLoaded && mapRef.current && selectedLote?.coordenadas && selectedLote.coordenadas.type === 'polygon') {
      const center = getPolygonCenter(selectedLote.coordenadas.coordinates as Coordenada[]);
      mapRef.current.panTo(center);
      mapRef.current.setZoom(18);
    }
  }, [selectedLote, isLoaded]); // Añadimos isLoaded a las dependencias

  // WebSocket listeners para actualizaciones en tiempo real
  useEffect(() => {
    // Listener para cambios de estado de lotes
    const unsubscribeLoteEstado = websocketService.on('lote-estado-actualizado', (data) => {
      console.log('🎯 Lote actualizado en tiempo real:', data);
      // Actualizar el lote específico en la lista
      const updatedLotes = lotes.map(lote =>
        lote.id === data.loteId
          ? { ...lote, estado: data.nuevoEstado }
          : lote
      );
      onLotesUpdate?.(updatedLotes);
    });

    // Listener para lotes liberados
    const unsubscribeLoteLiberado = websocketService.on('lote-liberado', (data) => {
      console.log('🎯 Lote liberado en tiempo real:', data);
      // Actualizar el lote específico a "En preparación"
      const updatedLotes = lotes.map(lote =>
        lote.id === data.loteId
          ? { ...lote, estado: 'En preparación' }
          : lote
      );
      onLotesUpdate?.(updatedLotes);
    });

    // Listener para cambios de estado de sublotes
    const unsubscribeSubloteEstado = websocketService.on('sublote-estado-actualizado', (data) => {
      console.log('🎯 Sublote actualizado en tiempo real:', data);
      // Los sublotes se actualizan desde el componente padre
      // Aquí solo notificamos que hubo un cambio
      onSublotesUpdate?.(sublotesConCultivos);
    });

    // Listener para sublotes liberados
    const unsubscribeSubloteLiberado = websocketService.on('sublote-liberado', (data) => {
      console.log('🎯 Sublote liberado en tiempo real:', data);
      // Los sublotes se actualizan desde el componente padre
      onSublotesUpdate?.(sublotesConCultivos);
    });

    // Cleanup function
    return () => {
      unsubscribeLoteEstado();
      unsubscribeLoteLiberado();
      unsubscribeSubloteEstado();
      unsubscribeSubloteLiberado();
    };
  }, [sublotesConCultivos, onLotesUpdate, onSublotesUpdate]);

  // CORRECCIÓN 2: También condicionamos este cálculo
  const centerForInfoWindow = isLoaded && selectedLote?.coordenadas && selectedLote.coordenadas.type === 'polygon'
    ? getPolygonCenter(selectedLote.coordenadas.coordinates as Coordenada[])
    : undefined;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-200 rounded-2xl">
        <div className="text-center p-4">
          <p className="text-red-600 font-semibold">Error: API Key de Google Maps no configurada</p>
          <p className="text-sm text-gray-600 mt-2">
            Configure VITE_GOOGLE_MAPS_API_KEY en el archivo .env
          </p>
        </div>
      </div>
    );
  }

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={initialCenter}
      zoom={6}
      options={{
        mapTypeId: "satellite",
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
      }}
      onLoad={(map) => {
        mapRef.current = map;
      }}
    >
      {parsedLotes.map(
        (lote) =>
          lote.coordenadas &&
          lote.coordenadas.type === 'polygon' &&
          (lote.coordenadas.coordinates as Coordenada[]).length > 0 && (
            <Polygon
              key={lote.id}
              paths={lote.coordenadas.coordinates as Coordenada[]}
              options={{
                fillColor: selectedLote?.id === lote.id ? "#F59E0B" : "#4CAF50",
                fillOpacity: 0.5,
                strokeColor: selectedLote?.id === lote.id ? "#D97706" : "#2E7D32",
                strokeOpacity: 1,
                strokeWeight: 2,
              }}
              onClick={() => onSelectLote(lote)}
            />
          )
      )}

      {/* Marcadores para sublotes con cultivos */}
      {sublotesConCultivos.map(
        (sublote) => {
          if (!sublote.coordenadas) return null;

          let position: { lat: number; lng: number };

          if (sublote.coordenadas.type === 'point' && sublote.coordenadas.coordinates) {
            position = {
              lat: sublote.coordenadas.coordinates.lat,
              lng: sublote.coordenadas.coordinates.lng
            };
          } else if (sublote.coordenadas.type === 'polygon' && sublote.coordenadas.coordinates && sublote.coordenadas.coordinates.length > 0) {
            // Calcular centro del polígono del sublote
            const bounds = new window.google.maps.LatLngBounds();
            sublote.coordenadas.coordinates.forEach((coord: any) => {
              bounds.extend(new window.google.maps.LatLng(coord.lat, coord.lng));
            });
            const center = bounds.getCenter();
            position = { lat: center.lat(), lng: center.lng() };
          } else {
            return null;
          }

          return (
            <Marker
              key={`sublote-marker-${sublote.id}`}
              position={position}
              icon={{
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="14" fill="#10B981" stroke="white" stroke-width="3"/>
                    <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">🌱</text>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(32, 32),
                anchor: new window.google.maps.Point(16, 32)
              }}
              title={`${sublote.nombre}: ${sublote.cultivo.nombre} (${sublote.cultivo.tipoCultivo?.nombre || 'Sin tipo'})`}
              onClick={() => {
                // Zoom automático al cultivo
                if (mapRef.current) {
                  mapRef.current.panTo(position);
                  mapRef.current.setZoom(18);
                }
                onSelectSubloteCultivo?.(sublote);
              }}
            />
          );
        }
      )}

      {selectedLote && centerForInfoWindow && (
        <InfoWindow
          position={centerForInfoWindow}
          onCloseClick={() => onSelectLote(null)}
        >
          {customInfo ? customInfo(selectedLote) : (
            <div className="p-1">
              <h4 className="font-bold text-md text-gray-800">
                {selectedLote.nombre}
              </h4>
              <p className="text-sm text-gray-600">
                <strong>Área:</strong> {selectedLote.area} m²
              </p>
              <p className="text-sm text-gray-600">
                <strong>Estado:</strong> {selectedLote.estado}
              </p>
            </div>
          )}
        </InfoWindow>
      )}

      {/* InfoWindow para cultivo seleccionado en sublote */}
      {selectedSubloteCultivo && (
        <InfoWindow
          position={
            selectedSubloteCultivo.coordenadas?.type === 'point' && selectedSubloteCultivo.coordenadas.coordinates
              ? {
                  lat: selectedSubloteCultivo.coordenadas.coordinates.lat,
                  lng: selectedSubloteCultivo.coordenadas.coordinates.lng
                }
              : selectedSubloteCultivo.coordenadas?.type === 'polygon' && selectedSubloteCultivo.coordenadas.coordinates
              ? (() => {
                  const bounds = new window.google.maps.LatLngBounds();
                  selectedSubloteCultivo.coordenadas!.coordinates.forEach((coord: any) => {
                    bounds.extend(new window.google.maps.LatLng(coord.lat, coord.lng));
                  });
                  const center = bounds.getCenter();
                  return { lat: center.lat(), lng: center.lng() };
                })()
              : { lat: 0, lng: 0 }
          }
          onCloseClick={() => onSelectSubloteCultivo?.(null)}
        >
          <div className="p-3 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 bg-green-100 rounded">
                <span className="text-green-600 text-sm">🌱</span>
              </div>
              <h4 className="font-bold text-gray-800">{selectedSubloteCultivo.cultivo.nombre}</h4>
            </div>
            <div className="space-y-1 text-sm">
              <p><strong>Sublote:</strong> {selectedSubloteCultivo.nombre}</p>
              <p><strong>Lote:</strong> {selectedSubloteCultivo.lote?.nombre}</p>
              <p><strong>Tipo:</strong> {selectedSubloteCultivo.cultivo.tipoCultivo?.nombre || 'No especificado'}</p>
              <p><strong>Estado:</strong> {selectedSubloteCultivo.cultivo.estado}</p>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  ) : (
    <div className="flex items-center justify-center h-full bg-gray-200 rounded-2xl">
      Cargando mapa...
    </div>
  );
}