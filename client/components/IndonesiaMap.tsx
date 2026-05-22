import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Inventory, ListResponse, Warehouse } from "@shared/api";

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
  healthy: "#f97316",
  critical: "#ef4444",
  overstock: "#f59e0b",
};

interface WarehouseMarker {
  name: string;
  lat: number;
  lng: number;
  stock: number;
  status: "healthy" | "critical" | "overstock";
  months: number;
}

function aggregateWarehouseStats(
  warehouses: Warehouse[],
  inventory: Inventory[]
): WarehouseMarker[] {
  return warehouses
    .filter(
      (w) =>
        typeof w.latitude === "number" &&
        typeof w.longitude === "number" &&
        !isNaN(w.latitude) &&
        !isNaN(w.longitude)
    )
    .map((w) => {
      const items = inventory.filter((i) => i.warehouse_id === w.id);
      const stock = items.reduce((sum, i) => sum + (i.current_stock || 0), 0);

      let criticalCount = 0;
      let overstockCount = 0;
      items.forEach((i) => {
        const s = (i.status || "").toLowerCase();
        if (s.includes("critical")) criticalCount++;
        else if (s.includes("overstock")) overstockCount++;
      });

      let status: "healthy" | "critical" | "overstock" = "healthy";
      if (criticalCount > 0) status = "critical";
      else if (overstockCount > items.length / 2 && items.length > 0)
        status = "overstock";

      // Rough months-of-supply: total stock / total predicted demand
      const totalDemand = items.reduce(
        (sum, i) => sum + (i.predicted_demand || 0),
        0
      );
      const months = totalDemand > 0 ? Math.max(1, Math.round(stock / totalDemand)) : 1;

      return {
        name: w.name,
        lat: Number(w.latitude),
        lng: Number(w.longitude),
        stock,
        status,
        months,
      };
    });
}

function FitBounds() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([[-10.5, 95.0], [5.5, 141.0]], { padding: [10, 10] });
  }, [map]);
  return null;
}

interface Props {
  className?: string;
}

export default function IndonesiaMap({ className = "w-full h-64" }: Props) {
  const [markers, setMarkers] = useState<WarehouseMarker[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [whRes, invRes] = await Promise.all([
          fetch("/api/warehouses"),
          fetch("/api/inventory"),
        ]);
        if (!whRes.ok || !invRes.ok) throw new Error("Failed to fetch map data");
        const whJson: ListResponse<Warehouse> = await whRes.json();
        const invJson: ListResponse<Inventory> = await invRes.json();
        if (cancelled) return;
        setMarkers(aggregateWarehouseStats(whJson.data, invJson.data));
      } catch (err) {
        console.error("IndonesiaMap fetch error:", err);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

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
        {markers.map((wh) => (
          <Marker
            key={wh.name}
            position={[wh.lat, wh.lng]}
            icon={makeIcon(statusColor[wh.status])}
          >
            <Popup>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{wh.name}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                Stock: {wh.stock.toLocaleString()}
              </div>
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
