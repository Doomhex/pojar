
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from "react-leaflet";

export interface Board {
  id: string;
  name: string;
  status: "online" | "offline";
  lat: number;
  lng: number;
}

interface DeviceMapProps {
  boards: Board[];
  onMapClick: (lat: number, lng: number) => void;
  selectingLocation?: boolean;
  selectedLocation?: { lat: number; lng: number } | null;
}

function MapClickHandler({
  onMapClick,
  enabled,
}: {
  onMapClick: (lat: number, lng: number) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click(event) {
      if (enabled) {
        onMapClick(event.latlng.lat, event.latlng.lng);
      }
    },
  });

  return null;
}

export default function DeviceMap({
  boards,
  onMapClick,
  selectingLocation = false,
  selectedLocation = null,
}: DeviceMapProps) {
  return (
    <div className={`map-wrapper ${selectingLocation ? "map-selecting" : ""}`}>
      <MapContainer
        center={[39.7747, 64.4286]}
        zoom={6}
        scrollWheelZoom
        className="device-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler
          onMapClick={onMapClick}
          enabled={selectingLocation}
        />

        {boards.map((board) => (
          <CircleMarker
            key={board.id}
            center={[board.lat, board.lng]}
            radius={9}
            pathOptions={{
              color: board.status === "online" ? "#69F0AE" : "#92929B",
              fillColor: board.status === "online" ? "#24C879" : "#666670",
              fillOpacity: 0.95,
              weight: 3,
            }}
          >
            <Popup>
              <strong>{board.name}</strong>
              <br />
              ID: {board.id}
              <br />
              Status: {board.status}
            </Popup>
          </CircleMarker>
        ))}

        {selectedLocation && (
          <CircleMarker
            center={[selectedLocation.lat, selectedLocation.lng]}
            radius={10}
            pathOptions={{
              color: "#FFFFFF",
              fillColor: "#24C879",
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>Selected device location</Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {selectingLocation && (
        <div className="map-instruction">
          <span /> Click anywhere on the map to place the board
        </div>
      )}
    </div>
  );
}

