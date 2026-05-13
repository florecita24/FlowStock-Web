import { useState } from "react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { Lightbulb } from "lucide-react";

const productList = [
  "Pencil 2B",
  "Wireless Earbuds",
  "Tablet Cases",
  "A4 Paper Reams",
  "Lipstick Matte",
  "Serum Vitamin C",
  "Kaos Polos",
];

const productChartData: Record<string, number[]> = {
  "Pencil 2B":        [300, 320, 280, 350, 400, 380, 420, 450, 390, 360, 340, 310],
  "Wireless Earbuds": [150, 180, 200, 190, 250, 300, 280, 350, 320, 280, 240, 210],
  "Tablet Cases":     [80,  90,  85, 100, 120, 110, 130, 140, 120, 100,  95,  85],
  "A4 Paper Reams":   [500, 520, 480, 550, 600, 580, 620, 650, 600, 550, 510, 490],
  "Lipstick Matte":   [200, 220, 210, 240, 270, 260, 290, 310, 280, 250, 230, 215],
  "Serum Vitamin C":  [120, 140, 130, 160, 200, 180, 220, 250, 210, 190, 165, 145],
  "Kaos Polos":       [400, 380, 420, 450, 500, 470, 520, 560, 510, 480, 440, 410],
};

const weeks = ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12"];
const HISTORICAL_CUTOFF = 6; // first 6 weeks are historical, rest are projection

export default function SalesPrediction() {
  const [selectedProduct, setSelectedProduct] = useState("Pencil 2B");
  const [variables, setVariables] = useState({
    kuartal: "Jan - Mar",
    marketing: "Payday Sale",
  });

  const data = productChartData[selectedProduct];
  const maxVal = Math.max(...data);
  const yMax = Math.ceil(maxVal / 100) * 100 + 100;

  const chartWidth = 500;
  const chartHeight = 260;
  const padLeft = 50;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 40;
  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  const toPoint = (i: number, val: number) => ({
    x: padLeft + (i / (weeks.length - 1)) * innerW,
    y: padTop + innerH - (val / yMax) * innerH,
  });

  const points = data.map((val, i) => toPoint(i, val));

  const histPath = points
    .slice(0, HISTORICAL_CUTOFF)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const projPath = points
    .slice(HISTORICAL_CUTOFF - 1)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const yTicks = [0, Math.round(yMax * 0.25), Math.round(yMax * 0.5), Math.round(yMax * 0.75), yMax];

  const peakIdx = data.indexOf(maxVal);
  const peakPoint = points[peakIdx];

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Predictive Analytics & What-If Simulator
          </h1>
          <p className="text-sm text-white mt-1">
            Simulasikan tren penjualan masa depan dengan Prediksi AI Engine.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* External Variables Panel */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center">
                <span className="text-purple-700 font-bold text-sm">⚙️</span>
              </div>
              <h2 className="text-lg font-bold text-foreground">External Variables</h2>
            </div>

            <div className="space-y-6 flex-1">
              {/* Kuartal */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Kuartal
                </label>
                <select
                  value={variables.kuartal}
                  onChange={(e) => setVariables({ ...variables, kuartal: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Jan - Mar</option>
                  <option>Apr - Jun</option>
                  <option>Jul - Sept</option>
                  <option>Oct - Des</option>
                </select>
              </div>

              {/* Marketing Campaign */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Marketing Campaign
                </label>
                <select
                  value={variables.marketing}
                  onChange={(e) => setVariables({ ...variables, marketing: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Payday Sale</option>
                  <option>Flash Sale</option>
                </select>
              </div>

              {/* Info Box */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-primary font-bold">ℹ️</span>
                  <span>
                    Model adjusts prediction dynamically based on historical
                    mapping of selected variables.
                  </span>
                </p>
              </div>
            </div>

            {/* Run Simulation Button */}
            <div className="mt-6 pt-4 border-t border-border">
              <Button className="w-full bg-primary text-primary-foreground">
                Run Simulation
              </Button>
            </div>
          </div>

          {/* Sales Projection Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground">
                Sales Projection (1 Kuartal)
              </h2>
              {/* Product Dropdown */}
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {productList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-muted-foreground">Historical Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 border-t-2 border-dashed border-green-500" />
                <span className="text-xs text-muted-foreground">AI Projection</span>
              </div>
            </div>

            {/* Chart */}
            <svg width={chartWidth} height={chartHeight} className="w-full">
              {/* Grid lines & Y labels */}
              {yTicks.map((val) => {
                const y = padTop + innerH - (val / yMax) * innerH;
                return (
                  <g key={`grid-${val}`}>
                    <line
                      x1={padLeft} y1={y}
                      x2={padLeft + innerW} y2={y}
                      stroke="#e5e7eb" strokeWidth="1"
                    />
                    <text
                      x={padLeft - 6} y={y + 4}
                      fontSize="11" fill="#9ca3af" textAnchor="end"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* X-axis labels */}
              {weeks.map((w, i) => {
                const x = padLeft + (i / (weeks.length - 1)) * innerW;
                return (
                  <text
                    key={`x-${i}`}
                    x={x} y={padTop + innerH + 20}
                    fontSize="11" fill="#9ca3af" textAnchor="middle"
                  >
                    {w}
                  </text>
                );
              })}

              {/* Historical line */}
              <path
                d={histPath}
                stroke="#3b82f6" strokeWidth="3"
                fill="none" strokeLinecap="round" strokeLinejoin="round"
              />

              {/* Projection line (dashed) */}
              <path
                d={projPath}
                stroke="#10b981" strokeWidth="2"
                fill="none" strokeDasharray="5,5"
                strokeLinecap="round" strokeLinejoin="round"
              />

              {/* Data points */}
              {points.map((p, i) => (
                <circle
                  key={`pt-${i}`}
                  cx={p.x} cy={p.y} r="4"
                  fill={i < HISTORICAL_CUTOFF ? "#3b82f6" : "#10b981"}
                  opacity={i >= HISTORICAL_CUTOFF ? 0.7 : 1}
                />
              ))}

              {/* Peak tooltip */}
              {peakPoint && (
                <g>
                  <line
                    x1={peakPoint.x} y1={peakPoint.y - 8}
                    x2={peakPoint.x} y2={peakPoint.y - 50}
                    stroke="#1f2937" strokeWidth="1"
                  />
                  <rect
                    x={peakPoint.x - 55} y={peakPoint.y - 78}
                    width="110" height="32"
                    fill="#1f2937" rx="6"
                  />
                  <text
                    x={peakPoint.x} y={peakPoint.y - 62}
                    fontSize="11" fill="#e5e7eb"
                    textAnchor="middle" fontWeight="500"
                  >
                    {weeks[peakIdx]} (Peak)
                  </text>
                  <text
                    x={peakPoint.x} y={peakPoint.y - 50}
                    fontSize="12" fill="#10b981"
                    textAnchor="middle" fontWeight="bold"
                  >
                    {maxVal.toLocaleString()} units
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
                  "{variables.marketing}"
                </span>{" "}
                pada kuartal{" "}
                <span className="font-semibold text-foreground">{variables.kuartal}</span>{" "}
                diterjemahkan ke permintaan rata-rata sebesar{" "}
                <span className="font-bold text-primary">35%</span>. Peningkatan buffer stock ditambah{" "}
                <span className="font-semibold">sebelum minggu ke-5</span>, untuk menghadapi risiko
                stockout pada kategori produk High-Demand.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
