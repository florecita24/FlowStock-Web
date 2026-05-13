import { useState } from "react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { Lightbulb } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const productList = [
  "Pencil 2B",
  "Wireless Earbuds",
  "Tablet Cases",
  "A4 Paper Reams",
  "Lipstick Matte",
  "Serum Vitamin C",
  "Kaos Polos",
];

const rawData: Record<string, number[]> = {
  "Pencil 2B":        [300, 320, 280, 350, 400, 380, 420, 450, 390, 360, 340, 310],
  "Wireless Earbuds": [150, 180, 200, 190, 250, 300, 280, 350, 320, 280, 240, 210],
  "Tablet Cases":     [80,  90,  85, 100, 120, 110, 130, 140, 120, 100,  95,  85],
  "A4 Paper Reams":   [500, 520, 480, 550, 600, 580, 620, 650, 600, 550, 510, 490],
  "Lipstick Matte":   [200, 220, 210, 240, 270, 260, 290, 310, 280, 250, 230, 215],
  "Serum Vitamin C":  [120, 140, 130, 160, 200, 180, 220, 250, 210, 190, 165, 145],
  "Kaos Polos":       [400, 380, 420, 450, 500, 470, 520, 560, 510, 480, 440, 410],
};

const HISTORICAL_CUTOFF = 6;

function buildChartData(product: string) {
  const values = rawData[product];
  return values.map((val, i) => ({
    week: `M${i + 1}`,
    historical: i < HISTORICAL_CUTOFF ? val : undefined,
    projection: i >= HISTORICAL_CUTOFF - 1 ? val : undefined,
  }));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0]?.value ?? payload[1]?.value;
    const isProjection = payload[0]?.name === "projection";
    return (
      <div className="bg-gray-900 text-white rounded-xl px-4 py-3 shadow-xl text-sm">
        <p className="text-gray-300 font-medium">{label} {isProjection ? "(Proyeksi)" : "(Historical)"}</p>
        <p className="text-green-400 font-bold text-base mt-0.5">{val?.toLocaleString()} units</p>
      </div>
    );
  }
  return null;
};

export default function SalesPrediction() {
  const [selectedProduct, setSelectedProduct] = useState("Pencil 2B");
  const [variables, setVariables] = useState({
    kuartal: "Jan - Mar",
    marketing: "Payday Sale",
  });

  const chartData = buildChartData(selectedProduct);
  const allValues = rawData[selectedProduct];
  const maxVal = Math.max(...allValues);
  const peakIdx = allValues.indexOf(maxVal);

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Predictive Analytics & What-If Simulator
          </h1>
          <p className="text-sm text-white mt-1">
            Simulasikan tren penjualan masa depan dengan Prediksi AI Engine.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* External Variables Panel */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center text-purple-700 font-bold text-sm">
                ⚙️
              </div>
              <h2 className="text-lg font-bold text-foreground">External Variables</h2>
            </div>

            <div className="space-y-5 flex-1">
              {/* Kuartal */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Kuartal</label>
                <select
                  value={variables.kuartal}
                  onChange={(e) => setVariables({ ...variables, kuartal: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Payday Sale</option>
                  <option>Flash Sale</option>
                </select>
              </div>

              {/* Info */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-primary font-bold">ℹ️</span>
                  <span>Model adjusts prediction dynamically based on historical mapping of selected variables.</span>
                </p>
              </div>
            </div>

            {/* Run Simulation */}
            <div className="mt-6 pt-4 border-t border-border">
              <Button className="w-full bg-primary text-primary-foreground">Run Simulation</Button>
            </div>
          </div>

          {/* Chart */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-border">
            {/* Chart Header */}
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-foreground">
                Sales Projection (1 Kuartal)
              </h2>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {productList.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mb-5 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-blue-500" />
                <span className="text-xs text-muted-foreground">Historical Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0 border-t-2 border-dashed border-green-500" />
                <span className="text-xs text-muted-foreground">AI Projection</span>
              </div>
            </div>

            {/* Recharts */}
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData} margin={{ top: 36, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Mark the split between historical and projection */}
                <ReferenceLine
                  x={`M${HISTORICAL_CUTOFF}`}
                  stroke="#e5e7eb"
                  strokeDasharray="4 4"
                  label={{ value: "Today", position: "top", fontSize: 11, fill: "#6b7280" }}
                />

                {/* Historical line */}
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: "#3b82f6" }}
                  connectNulls={false}
                />

                {/* Projection line dashed */}
                <Line
                  type="monotone"
                  dataKey="projection"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 6, fill: "#10b981" }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Peak info */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Peak:</span>
              <span className="text-xs font-semibold text-green-600">
                M{peakIdx + 1} — {maxVal.toLocaleString()} units
              </span>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-pink-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-pink-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground mb-2">AI Insight</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Penerapan{" "}
                <span className="font-semibold text-foreground">"{variables.marketing}"</span>{" "}
                pada kuartal{" "}
                <span className="font-semibold text-foreground">{variables.kuartal}</span>{" "}
                diterjemahkan ke permintaan rata-rata sebesar{" "}
                <span className="font-bold text-primary">35%</span>. Peningkatan buffer stock
                ditambah <span className="font-semibold">sebelum minggu ke-5</span>, untuk
                menghadapi risiko stockout pada kategori produk High-Demand.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
