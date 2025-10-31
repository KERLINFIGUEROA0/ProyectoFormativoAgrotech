// src/features/cultivos/components/LotesMap.tsx

import { type ReactElement, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Polygon,
  InfoWindow,
} from "@react-google-maps/api";
import type { Coordenada, Lote } from '../interfaces/cultivos';


interface LotesMapProps {
  lotes: Lote[];
  selectedLote: Lote | null;
  onSelectLote: (lote: Lote | null) => void;
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
}: LotesMapProps): ReactElement {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: libraries,
  });
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    // CORRECCIÓN 1: Condicionamos la ejecución a que isLoaded sea true
    if (isLoaded && mapRef.current && selectedLote?.coordenadasPoligono) {
      const center = getPolygonCenter(selectedLote.coordenadasPoligono);
      mapRef.current.panTo(center);
      mapRef.current.setZoom(18);
    }
  }, [selectedLote, isLoaded]); // Añadimos isLoaded a las dependencias

  // CORRECCIÓN 2: También condicionamos este cálculo
  const centerForInfoWindow = isLoaded && selectedLote?.coordenadasPoligono
    ? getPolygonCenter(selectedLote.coordenadasPoligono)
    : undefined;

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
      {lotes.map(
        (lote) =>
          lote.coordenadasPoligono &&
          lote.coordenadasPoligono.length > 0 && (
            <Polygon
              key={lote.id}
              paths={lote.coordenadasPoligono}
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

      {selectedLote && centerForInfoWindow && (
        <InfoWindow
          position={centerForInfoWindow}
          onCloseClick={() => onSelectLote(null)}
        >
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
        </InfoWindow>
      )}
    </GoogleMap>
  ) : (
    <div className="flex items-center justify-center h-full bg-gray-200 rounded-2xl">
      Cargando mapa...
    </div>
  );
}