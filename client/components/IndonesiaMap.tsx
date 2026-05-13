import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

const makeIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;
      background:${color};
      border:2.5px solid white;
      border-radius:50%;
      box-shadow:0 1px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const statusColor: Record<string, string> = {
  healthy:   "#f97316",
  critical:  "#ef4444",
  overstock: "#f59e0b",
};

export const warehouses = [
  { name: "Jakarta Hub",  lat: -6.2088, lng: 106.8456, stock: 4920, status: "healthy",   months: 2 },
  { name: "Surabaya Hub", lat: -7.2575, lng: 112.7521, stock: 2310, status: "healthy",   months: 3 },
  { name: "Medan Hub",    lat:  3.5952, lng:  98.6722, stock: 1850, status: "critical",  months: 1 },
  { name: "Makassar Hub", lat: -5.1477, lng: 119.4327, stock:  980, status: "healthy",   months: 2 },
  { name: "Bandung Hub",  lat: -6.9175, lng: 107.6191, stock:  760, status: "overstock", months: 5 },
  { name: "Semarang Hub", lat: -6.9932, lng: 110.4203, stock: 1120, status: "healthy",   months: 2 },
  { name: "Denpasar Hub", lat: -8.6705, lng: 115.2126, stock:  430, status: "critical",  months: 1 },
];

function FitBounds() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([[-10.5, 95.0], [5.5, 141.0]], { padding: [10, 10] });
  }, [map]);
  return null;
}

interface Props { className?: string; }

export default function IndonesiaMap({ className = "w-full h-64" }: Props) {
  return (
    <div className={`rounded-xl overflow-hidden border border-border ${className}`}>
      <MapContainer
        center={[-2.5, 118]}
        zoom={4}
        minZoom={3}
        maxZoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl
      >
        <FitBounds />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.85}
        />
        {warehouses.map((wh) => (
          <Marker
            key={wh.name}
            position={[wh.lat, wh.lng]}
            icon={makeIcon(statusColor[wh.status])}
          >
            <Popup>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{wh.name}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Stock: {wh.stock.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: statusColor[wh.status] }}>
                {wh.months} {wh.months === 1 ? "month" : "months"} supply
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
