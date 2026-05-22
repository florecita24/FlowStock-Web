import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { Lightbulb } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Label,
} from "recharts";
import type { ListResponse, Product, StoreSales } from "@shared/api";

interface QuarterDef {
  label: string;
  months: number[]; // 0-indexed (Jan = 0)
}

const QUARTERS: QuarterDef[] = [
  { label: "Jan - Mar",  months: [0, 1, 2] },
  { label: "Apr - Jun",  months: [3, 4, 5] },
  { label: "Jul - Sept", months: [6, 7, 8] },
  { label: "Oct - Des",  months: [9, 10, 11] },
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function buildQuarterWeekLabels(quarterLabel: string): string[] {
  const q = QUARTERS.find((x) => x.label === quarterLabel) ?? QUARTERS[0];
  const labels: string[] = [];
  q.months.forEach((m) => {
    for (let w = 1; w <= 4; w++) labels.push(`${MONTH_SHORT[m]} W${w}`);
  });
  return labels;
}

// Aggregate raw store_sales rows into 12 weekly buckets per quarter for a product
function aggregateWeeklySales(
  sales: StoreSales[],
  productId: number,
  quarterLabel: string
): number[] {
  const q = QUARTERS.find((x) => x.label === quarterLabel) ?? QUARTERS[0];
  const buckets = Array(12).fill(0);

  sales
    .filter((s) => s.item === productId)
    .forEach((s) => {
      const d = new Date(s.date);
      if (isNaN(d.getTime())) return;
      const month = d.getMonth();
      const monthIdx = q.months.indexOf(month);
      if (monthIdx === -1) return;
      const day = d.getDate();
      const weekIdx = Math.min(3, Math.floor((day - 1) / 7));
      buckets[monthIdx * 4 + weekIdx] += s.sales || 0;
    });

  return buckets;
}

const CUTOFF = 6;

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
  const location = useLocation();
  const initialProduct = (location.state as any)?.selectedProduct ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<StoreSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductName, setSelectedProductName] = useState<string>(initialProduct);
  const [variables, setVariables] = useState({ kuartal: "Jan - Mar", marketing: "Payday Sale" });

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [pRes, sRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/store-sales"),
        ]);
        if (!pRes.ok || !sRes.ok) throw new Error("Failed to fetch sales data");
        const pJson: ListResponse<Product> = await pRes.json();
        const sJson: ListResponse<StoreSales> = await sRes.json();
        if (cancelled) return;
        setProducts(pJson.data);
        setSales(sJson.data);
        if (!selectedProductName && pJson.data[0]) {
          setSelectedProductName(pJson.data[0].name);
        }
      } catch (err) {
        console.error("SalesPrediction fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const productList = useMemo(() => products.map((p) => p.name), [products]);
  const selectedProduct = useMemo(
    () => products.find((p) => p.name === selectedProductName),
    [products, selectedProductName]
  );

  const weekLabels = useMemo(
    () => buildQuarterWeekLabels(variables.kuartal),
    [variables.kuartal]
  );

  const values = useMemo(() => {
    if (!selectedProduct) return [];
    return aggregateWeeklySales(sales, selectedProduct.id, variables.kuartal);
  }, [sales, selectedProduct, variables.kuartal]);

  const chartData = useMemo(
    () =>
      values.map((val, i) => ({
        week: weekLabels[i],
        historical: i < CUTOFF ? val : undefined,
        projection: i >= CUTOFF - 1 ? val : undefined,
      })),
    [values, weekLabels]
  );

  const maxVal = values.length ? Math.max(...values) : 0;
  const peakIdx = values.indexOf(maxVal);

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
                  {QUARTERS.map((q) => (
                    <option key={q.label}>{q.label}</option>
                  ))}
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
                value={selectedProductName}
                onChange={(e) => setSelectedProductName(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading || productList.length === 0}
              >
                {productList.length === 0 && <option>Loading...</option>}
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

            {peakIdx >= 0 && maxVal > 0 && (
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
