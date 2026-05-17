import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Shipment } from '../lib/types';

// Fix Leaflet marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/713/713311.png', // Truck icon
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

interface TrackingMapProps {
  shipment: Shipment;
}

const FitBounds: React.FC<{ bounds: L.LatLngBoundsExpression }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
};

const TrackingMap: React.FC<TrackingMapProps> = ({ shipment }) => {
  const { origin, destination, progress } = shipment;

  // Calculate current truck position
  const currentPos = useMemo(() => {
    const lat = origin.lat + (destination.lat - origin.lat) * (progress / 100);
    const lng = origin.lng + (destination.lng - origin.lng) * (progress / 100);
    return [lat, lng] as [number, number];
  }, [origin, destination, progress]);

  const bounds = useMemo(() => {
    return L.latLngBounds(
      [origin.lat, origin.lng],
      [destination.lat, destination.lng]
    );
  }, [origin, destination]);

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
      <MapContainer
        center={[origin.lat, origin.lng]}
        zoom={6}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {/* Origin */}
        <Marker position={[origin.lat, origin.lng]}>
        </Marker>

        {/* Destination */}
        <Marker position={[destination.lat, destination.lng]}>
        </Marker>

        {/* Path */}
        <Polyline
          positions={[
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
          ]}
          color="#94a3b8"
          weight={2}
          dashArray="10, 10"
        />

        {/* Completed Path */}
        <Polyline
          positions={[
            [origin.lat, origin.lng],
            currentPos,
          ]}
          color="#f59e0b"
          weight={4}
          dashArray="1, 8"
          lineCap="round"
        />

        {/* Truck */}
        <Marker position={currentPos} icon={truckIcon} />

        <FitBounds bounds={bounds} />
      </MapContainer>
    </div>
  );
};

export default TrackingMap;
