import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { Lightbulb } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Label,
} from "recharts";

const productList = [
  "Pencil 2B", "Wireless Earbuds", "Tablet Cases", "A4 Paper Reams",
  "Lipstick Matte", "Serum Vitamin C", "Kaos Polos", "Smart Watches", "Foundation",
];

const quarterWeekLabels: Record<string, string[]> = {
  "Jan - Mar":  ["Jan W1","Jan W2","Jan W3","Jan W4","Feb W1","Feb W2","Feb W3","Feb W4","Mar W1","Mar W2","Mar W3","Mar W4"],
  "Apr - Jun":  ["Apr W1","Apr W2","Apr W3","Apr W4","May W1","May W2","May W3","May W4","Jun W1","Jun W2","Jun W3","Jun W4"],
  "Jul - Sept": ["Jul W1","Jul W2","Jul W3","Jul W4","Aug W1","Aug W2","Aug W3","Aug W4","Sep W1","Sep W2","Sep W3","Sep W4"],
  "Oct - Des":  ["Oct W1","Oct W2","Oct W3","Oct W4","Nov W1","Nov W2","Nov W3","Nov W4","Dec W1","Dec W2","Dec W3","Dec W4"],
};

// Quarterly data — each quarter has distinct patterns per product
const rawDataByQuarter: Record<string, Record<string, number[]>> = {
  "Jan - Mar": {
    "Pencil 2B":        [300, 320, 280, 350, 400, 380, 420, 450, 390, 360, 340, 310],
    "Wireless Earbuds": [150, 180, 200, 190, 250, 300, 280, 350, 320, 280, 240, 210],
    "Tablet Cases":     [ 80,  90,  85, 100, 120, 110, 130, 140, 120, 100,  95,  85],
    "A4 Paper Reams":   [500, 520, 480, 550, 600, 580, 620, 650, 600, 550, 510, 490],
    "Lipstick Matte":   [200, 220, 210, 240, 270, 260, 290, 310, 280, 250, 230, 215],
    "Serum Vitamin C":  [120, 140, 130, 160, 200, 180, 220, 250, 210, 190, 165, 145],
    "Kaos Polos":       [400, 380, 420, 450, 500, 470, 520, 560, 510, 480, 440, 410],
    "Smart Watches":    [2500,2800,3200,3500,3800,4200,5200,6800,7500,7200,6500,5800],
    "Foundation":       [180, 200, 195, 220, 250, 240, 265, 280, 260, 240, 220, 200],
  },
  "Apr - Jun": {
    "Pencil 2B":        [290, 310, 330, 380, 420, 410, 460, 490, 440, 400, 370, 340],
    "Wireless Earbuds": [180, 210, 230, 220, 290, 340, 320, 400, 370, 320, 280, 250],
    "Tablet Cases":     [ 95, 105, 100, 120, 145, 130, 155, 165, 140, 120, 110, 100],
    "A4 Paper Reams":   [480, 500, 460, 530, 580, 560, 600, 630, 580, 530, 490, 470],
    "Lipstick Matte":   [260, 285, 270, 310, 350, 330, 380, 400, 360, 320, 300, 275],
    "Serum Vitamin C":  [160, 185, 175, 205, 255, 235, 275, 305, 265, 240, 210, 185],
    "Kaos Polos":       [520, 490, 550, 590, 650, 610, 670, 720, 660, 620, 570, 530],
    "Smart Watches":    [3000,3400,3900,4200,4600,5100,6300,8200,9000,8700,7900,7000],
    "Foundation":       [230, 255, 250, 285, 320, 310, 340, 360, 335, 310, 280, 255],
  },
  "Jul - Sept": {
    "Pencil 2B":        [340, 370, 420, 480, 510, 490, 540, 570, 510, 470, 440, 400],
    "Wireless Earbuds": [220, 255, 280, 265, 350, 410, 385, 480, 445, 385, 335, 300],
    "Tablet Cases":     [115, 130, 125, 150, 180, 165, 195, 210, 175, 150, 140, 125],
    "A4 Paper Reams":   [540, 565, 520, 595, 650, 630, 670, 710, 655, 595, 555, 530],
    "Lipstick Matte":   [310, 340, 325, 370, 420, 395, 455, 475, 430, 380, 355, 325],
    "Serum Vitamin C":  [200, 230, 220, 255, 320, 295, 345, 385, 335, 300, 265, 230],
    "Kaos Polos":       [610, 575, 645, 685, 760, 715, 785, 840, 770, 720, 665, 615],
    "Smart Watches":    [3500,3900,4500,4900,5400,5900,7300,9500,10500,10100,9200,8100],
    "Foundation":       [275, 305, 295, 335, 375, 360, 395, 420, 390, 360, 325, 295],
  },
  "Oct - Des": {
    "Pencil 2B":        [380, 420, 480, 560, 610, 580, 650, 720, 670, 620, 810, 950],
    "Wireless Earbuds": [280, 325, 360, 340, 450, 530, 495, 620, 580, 500, 750, 980],
    "Tablet Cases":     [145, 165, 160, 195, 235, 215, 255, 275, 230, 195, 310, 420],
    "A4 Paper Reams":   [590, 615, 565, 645, 700, 680, 720, 760, 700, 640, 700, 760],
    "Lipstick Matte":   [380, 420, 400, 460, 530, 500, 575, 605, 555, 490, 680, 820],
    "Serum Vitamin C":  [250, 285, 270, 310, 385, 355, 415, 460, 400, 355, 470, 580],
    "Kaos Polos":       [740, 695, 785, 830, 920, 865, 950, 1020, 940, 875, 1100, 1350],
    "Smart Watches":    [4200,4800,5500,6000,6700,7200,8800,11500,12800,12300,15000,18500],
    "Foundation":       [330, 370, 355, 405, 455, 435, 480, 510, 475, 435, 580, 720],
  },
};

const CUTOFF = 6;

function buildData(product: string, quarter: string) {
  const data   = rawDataByQuarter[quarter]?.[product] ?? rawDataByQuarter["Jan - Mar"]["Pencil 2B"];
  const labels = quarterWeekLabels[quarter];
  return data.map((val, i) => ({
    week:       labels[i],
    historical: i < CUTOFF      ? val : undefined,
    projection: i >= CUTOFF - 1 ? val : undefined,
  }));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? payload[1]?.value;
  const isP = payload[0]?.name === "projection";
  return (
    <div className="bg-gray-900 text-white rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-gray-300 font-medium">{label} {isP ? "(Projection)" : "(Historical)"}</p>
      <p className="text-green-400 font-bold text-base mt-0.5">{val?.toLocaleString()} units</p>
    </div>
  );
};

export default function SalesPrediction() {
  const location       = useLocation();
  const initialProduct = (location.state as any)?.selectedProduct ?? "Pencil 2B";

  const [selectedProduct, setSelectedProduct] = useState(
    productList.includes(initialProduct) ? initialProduct : "Pencil 2B"
  );
  const [variables, setVariables] = useState({ kuartal: "Jan - Mar", marketing: "Payday Sale" });

  const chartData  = buildData(selectedProduct, variables.kuartal);
  const weekLabels = quarterWeekLabels[variables.kuartal];
  const values     = rawDataByQuarter[variables.kuartal]?.[selectedProduct] ?? [];
  const maxVal     = values.length ? Math.max(...values) : 0;
  const peakIdx    = values.indexOf(maxVal);

  return (
    <Layout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Predictive Analytics & What-If Simulator
          </h1>
          <p className="text-sm text-white mt-1">
            Simulate future sales trends with the AI Prediction Engine.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* External Variables */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center text-purple-700 font-bold text-sm">
                ⚙️
              </div>
              <h2 className="text-lg font-bold text-foreground">External Variables</h2>
            </div>

            <div className="space-y-5 flex-1">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Quarter</label>
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

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-primary font-bold">ℹ️</span>
                  <span>Model adjusts prediction dynamically based on historical mapping of selected variables.</span>
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <Button className="w-full bg-primary text-primary-foreground">Run Simulation</Button>
            </div>
          </div>

          {/* Chart */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground">
                Sales Projection (1 Quarter — {variables.kuartal})
              </h2>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {productList.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-6 mb-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-blue-500" />
                <span className="text-xs text-muted-foreground">Historical Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0 border-t-2 border-dashed border-green-500" />
                <span className="text-xs text-muted-foreground">AI Projection</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 36, right: 24, left: 20, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />

                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={65}
                >
                  <Label
                    value="Week"
                    position="insideBottom"
                    offset={-32}
                    style={{ fontSize: 12, fill: "#6b7280", fontWeight: 600 }}
                  />
                </XAxis>

                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                  width={52}
                >
                  <Label
                    value="Units Sold"
                    angle={-90}
                    position="insideLeft"
                    offset={10}
                    style={{ fontSize: 12, fill: "#6b7280", fontWeight: 600 }}
                  />
                </YAxis>

                <Tooltip content={<CustomTooltip />} />

                <ReferenceLine
                  x={weekLabels[CUTOFF - 1]}
                  stroke="#d1d5db"
                  strokeDasharray="4 4"
                  label={{ value: "Today", position: "top", fontSize: 11, fill: "#6b7280" }}
                />

                <Line type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={3}
                  dot={false} activeDot={{ r: 6, fill: "#3b82f6" }} connectNulls={false} />
                <Line type="monotone" dataKey="projection" stroke="#10b981" strokeWidth={2.5}
                  strokeDasharray="6 4" dot={false} activeDot={{ r: 6, fill: "#10b981" }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>

            {peakIdx >= 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">Peak:</span>
                <span className="text-xs font-semibold text-green-600">
                  {weekLabels[peakIdx]} — {maxVal.toLocaleString()} units
                </span>
              </div>
            )}
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
                Applying{" "}
                <span className="font-semibold text-foreground">"{variables.marketing}"</span>{" "}
                in the{" "}
                <span className="font-semibold text-foreground">{variables.kuartal}</span>{" "}
                quarter translates to an average demand increase of{" "}
                <span className="font-bold text-primary">35%</span>. Increase buffer stock
                before <span className="font-semibold">Week 5</span> to avoid stockout risk
                in High-Demand product categories.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
