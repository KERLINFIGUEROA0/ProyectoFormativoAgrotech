import { useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configuración básica del icono del marcador
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface SelectorUbicacionMapProps {
  coordenadasLotePadre: any[]; // Las coordenadas del polígono del Lote
  alSeleccionarPunto: (lat: number, lng: number) => void;
  puntoInicial?: { lat: number; lng: number } | null;
}

// Subcomponente para detectar clics en el mapa
function ClickHandler({ handleMapClick }: { handleMapClick: (e: { latlng: { lat: number; lng: number } }) => void }) {
  useMapEvents({
    click: handleMapClick,
  });
  return null;
}

const SelectorUbicacionMap = ({ coordenadasLotePadre, alSeleccionarPunto, puntoInicial }: SelectorUbicacionMapProps) => {
  const [posicion, setPosicion] = useState<[number, number] | null>(puntoInicial ? [puntoInicial.lat, puntoInicial.lng] : null);

  // Calcular el centro del mapa basado en el lote padre
  const centroMapa: [number, number] = coordenadasLotePadre && coordenadasLotePadre.length > 0
    ? [coordenadasLotePadre[0].lat, coordenadasLotePadre[0].lng] // Tomamos el primer punto como referencia rápida
    : [0, 0];

  const onMapClick = (e: { latlng: { lat: number; lng: number } }) => {
    const { lat, lng } = e.latlng;
    setPosicion([lat, lng]);
    alSeleccionarPunto(lat, lng); // Enviamos las coordenadas al formulario padre
  };

  return (
    <div style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer {...({ center: centroMapa, zoom: 16, style: { height: '100%', width: '100%' } } as any)}>
        <TileLayer {...({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' } as any)} />

        {/* 1. Dibujamos el Lote Padre para referencia visual */}
        {coordenadasLotePadre && (
            <Polygon
                positions={coordenadasLotePadre}
                pathOptions={{ color: 'blue', fillOpacity: 0.1 }}
            />
        )}

        {/* 2. El marcador del punto seleccionado */}
        {posicion && (
          // @ts-ignore
          <Marker position={posicion} icon={icon}>
            <Popup>Punto de referencia del Sublote</Popup>
          </Marker>
        )}

        {/* 3. Detector de clics */}
        <ClickHandler handleMapClick={onMapClick} />
      </MapContainer>

      <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
        <p>Haz clic dentro del área azul para marcar el punto de referencia.</p>
      </div>
    </div>
  );
};

export default SelectorUbicacionMap;
