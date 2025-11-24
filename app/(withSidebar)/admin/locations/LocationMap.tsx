"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, LayersControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Component to update center when props change
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

interface LocationMapProps {
  center: [number, number];
  zoom?: number;
  interactive?: boolean;
  locations?: any[];
  draggableMarkerPosition?: [number, number];
  onMarkerDragEnd?: (lat: number, lng: number) => void;
  geofenceRadius?: number;
}

export default function LocationMap({
  center,
  zoom = 13,
  interactive = false,
  locations = [],
  draggableMarkerPosition,
  onMarkerDragEnd,
  geofenceRadius
}: LocationMapProps) {
  
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null && onMarkerDragEnd) {
          const { lat, lng } = marker.getLatLng();
          onMarkerDragEnd(lat, lng);
        }
      },
    }),
    [onMarkerDragEnd]
  );

  // Fix marker icons for Leaflet in React/Next.js
  useEffect(() => {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
    >
      <MapController center={center} />
      
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Satellite (Esri)">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Street Map (OSM)">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {/* Render List of Locations (Read Only Mode) */}
      {!interactive && locations.map((location) => (
         <div key={location.id}>
            <Marker position={[location.latitude!, location.longitude!]}>
            <Popup>
                <div className="p-2">
                <p className="font-bold">{location.name}</p>
                <p className="text-sm text-gray-600">{location.address}</p>
                <p className="text-xs mt-1 text-blue-600">
                    Radius: {location.geofenceRadius || 100}m
                </p>
                </div>
            </Popup>
            </Marker>
            <Circle
            center={[location.latitude!, location.longitude!]}
            radius={location.geofenceRadius || 100}
            pathOptions={{
                color: location.isActive ? "#3B82F6" : "#94a3b8",
                fillColor: location.isActive ? "#3B82F6" : "#94a3b8",
                fillOpacity: 0.2,
            }}
            />
        </div>
      ))}

      {/* Render Draggable Marker (Interactive Mode) */}
      {interactive && draggableMarkerPosition && (
        <>
            <Marker
                position={draggableMarkerPosition}
                draggable={true}
                eventHandlers={eventHandlers}
                ref={markerRef}
            >
                <Popup>Drag me to move location</Popup>
            </Marker>
            <Circle
                center={draggableMarkerPosition}
                radius={geofenceRadius || 100}
                pathOptions={{
                color: "#3B82F6",
                fillColor: "#3B82F6",
                fillOpacity: 0.2,
                weight: 2,
                dashArray: "5, 5"
                }}
            />
        </>
      )}
    </MapContainer>
  );
}

