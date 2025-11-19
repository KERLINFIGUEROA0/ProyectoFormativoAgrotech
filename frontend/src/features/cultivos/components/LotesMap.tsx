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


interface LotesMapProps {
  lotes: Lote[];
  selectedLote: Lote | null;
  onSelectLote: (lote: Lote | null) => void;
  customInfo?: (lote: Lote) => ReactElement;
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

      {/* Marcadores para lotes con cultivos */}
      {lotes.map(
        (lote: Lote) => {
          const hasCultivos = lote.surcos && lote.surcos.some((s: any) => s.cultivo);
          if (!hasCultivos || !lote.coordenadas || lote.coordenadas.type !== 'polygon' || !(lote.coordenadas.coordinates as Coordenada[]).length) {
            return null;
          }
          const center = getPolygonCenter(lote.coordenadas.coordinates as Coordenada[]);
          const cultivosCount = lote.surcos?.filter((s: any) => s.cultivo).length || 0;
          return (
            <Marker
              key={`marker-${lote.id}`}
              position={center}
              onClick={() => onSelectLote(lote)}
              title={`${lote.nombre}: ${cultivosCount} cultivo${cultivosCount !== 1 ? 's' : ''}`}
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
    </GoogleMap>
  ) : (
    <div className="flex items-center justify-center h-full bg-gray-200 rounded-2xl">
      Cargando mapa...
    </div>
  );
}