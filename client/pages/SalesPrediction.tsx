import { useState } from "react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { TrendingUp, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SalesPrediction() {
  const [selectedPoint, setSelectedPoint] = useState<{
    date: string;
    units: number;
  } | null>({ date: "Jun 03 (Display Peak)", units: 6450 });

  const [variables, setVariables] = useState({
    weather: "Normal",
    marketing: "Payday Sale",
    seasonality: 80,
  });

  const dates = [
    "01 May",
    "10 May",
    "20 May",
    "Today",
    "10 Jun",
    "20 Jun",
    "30 Jun",
  ];

  // Simulated data points for the chart
  const dataPoints = [
    { x: 0, y: 25, label: "01 May" },
    { x: 1, y: 35, label: "10 May" },
    { x: 2, y: 45, label: "20 May" },
    { x: 3, y: 55, label: "Today" },
    { x: 4, y: 75, label: "10 Jun" },
    { x: 5, y: 95, label: "Jun 03" },
    { x: 6, y: 50, label: "30 Jun" },
  ];

  const chartWidth = 400;
  const chartHeight = 250;
  const padding = 40;
  const innerWidth = chartWidth - 2 * padding;
  const innerHeight = chartHeight - 2 * padding;

  // Create SVG path for the chart line
  const points = dataPoints.map((point) => ({
    x: padding + (point.x / 6) * innerWidth,
    y: padding + innerHeight - (point.y / 100) * innerHeight,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Dashed line for projection
  const projectionStart = 3;
  const projectionPathD = points
    .slice(projectionStart)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Predictive Analytics & What-If Simulator
            </h1>
            <p className="text-sm text-white mt-1">
              Simulasikan tren penjualan masa depan dengan Prediksi AI Engine.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="bg-white border-border">
              Save Scenario
            </Button>
            <Button className="bg-primary text-primary-foreground">
              Run Simulation
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* External Variables Panel */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center">
                <span className="text-purple-700 font-bold text-sm">⚙️</span>
              </div>
              <h2 className="text-lg font-bold text-foreground">
                External Variables
              </h2>
            </div>

            <div className="space-y-6">
              {/* Weather Condition */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Weather Condition
                </label>
                <select
                  value={variables.weather}
                  onChange={(e) =>
                    setVariables({ ...variables, weather: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Normal</option>
                  <option>Rainy</option>
                  <option>Sunny</option>
                </select>
              </div>

              {/* Marketing Campaign */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Marketing Campaign
                </label>
                <select
                  value={variables.marketing}
                  onChange={(e) =>
                    setVariables({ ...variables, marketing: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>No Campaign</option>
                  <option>Payday Sale</option>
                  <option>Flash Sale</option>
                  <option>Seasonal Promo</option>
                </select>
              </div>

              {/* Seasonality Impact */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-4">
                  Seasonality Impact
                </label>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={variables.seasonality}
                    onChange={(e) =>
                      setVariables({
                        ...variables,
                        seasonality: parseInt(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="font-medium">Low</span>
                    <span className="font-medium">Medium</span>
                    <span className="text-primary font-bold">
                      High ({variables.seasonality}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-muted/50 rounded-lg p-4 mt-6">
                <p className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-primary font-bold">ℹ️</span>
                  <span>
                    Model adjusts prediction dynamically based on historical
                    mapping of selected variables.
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Demand Projection Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Demand Projection (30 Days)
            </h2>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-muted-foreground">
                  Historical Data
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 border-t-2 border-dashed border-green-500" />
                <span className="text-xs text-muted-foreground">
                  AI Projection
                </span>
              </div>
            </div>

            {/* Chart */}
            <svg width={chartWidth} height={chartHeight} className="w-full">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((val) => (
                <line
                  key={`grid-${val}`}
                  x1={padding}
                  y1={padding + innerHeight - (val / 100) * innerHeight}
                  x2={padding + innerWidth}
                  y2={padding + innerHeight - (val / 100) * innerHeight}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              ))}

              {/* Y-axis labels */}
              {[0, 25, 50, 75, 100].map((val) => (
                <text
                  key={`y-label-${val}`}
                  x={padding - 10}
                  y={padding + innerHeight - (val / 100) * innerHeight + 4}
                  fontSize="12"
                  fill="#9ca3af"
                  textAnchor="end"
                >
                  {val}%
                </text>
              ))}

              {/* X-axis labels */}
              {dates.map((date, i) => (
                <text
                  key={`x-label-${i}`}
                  x={padding + (i / 6) * innerWidth}
                  y={padding + innerHeight + 20}
                  fontSize="12"
                  fill="#9ca3af"
                  textAnchor="middle"
                >
                  {date}
                </text>
              ))}

              {/* Historical data line */}
              <path
                d={pathD}
                stroke="#3b82f6"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Projection line (dashed) */}
              <path
                d={projectionPathD}
                stroke="#10b981"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5,5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {points.map((p, i) => (
                <circle
                  key={`point-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#3b82f6"
                  opacity={i >= 3 ? 0.5 : 1}
                />
              ))}

              {/* Tooltip */}
              {selectedPoint && (
                <g>
                  {/* Line to point */}
                  <line
                    x1={points[5].x}
                    y1={points[5].y - 40}
                    x2={points[5].x}
                    y2={points[5].y}
                    stroke="#1f2937"
                    strokeWidth="1"
                  />
                  {/* Tooltip box */}
                  <rect
                    x={points[5].x - 60}
                    y={points[5].y - 70}
                    width="120"
                    height="50"
                    fill="#1f2937"
                    rx="6"
                  />
                  {/* Tooltip text */}
                  <text
                    x={points[5].x}
                    y={points[5].y - 50}
                    fontSize="12"
                    fill="#e5e7eb"
                    textAnchor="middle"
                    fontWeight="500"
                  >
                    {selectedPoint.date}
                  </text>
                  <text
                    x={points[5].x}
                    y={points[5].y - 35}
                    fontSize="14"
                    fill="#10b981"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {selectedPoint.units.toLocaleString()} units
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* AI Insight Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-pink-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-pink-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground mb-2">AI Insight</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Peningkatan{" "}
                <span className="font-semibold text-foreground">
                  "Payday Sale"
                </span>{" "}
                dengan demand denarik maksimum tinggi diterjemahkan ke permintaan rata-rata
                sebesar{" "}
                <span className="font-bold text-primary">35%</span>. Peningkatan buffer stock ditambah
                <span className="font-semibold">sebelum tanggal 25</span>, untuk menghadapi risiko
                stockout pada kategori produk High-Demand.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
