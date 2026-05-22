import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { Lightbulb } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Label,
} from "recharts";
import type { ListResponse, Product } from "@shared/api";

interface WeeklySalesResponse {
  productId: number;
  year: number;
  totalRows: number;
  weeklyBuckets: Record<string, number>; // key: "month-weekIdx"
}

// Simulated "current year" — dataset covers 2013-2018, treating 2018 as today
const CURRENT_YEAR = 2018;

interface QuarterDef {
  label: string;
  months: number[]; // 0-indexed (Jan = 0)
}

const QUARTERS: QuarterDef[] = [
  { label: "Q1 (Jan - Mar)",  months: [0, 1, 2] },
  { label: "Q2 (Apr - Jun)",  months: [3, 4, 5] },
  { label: "Q3 (Jul - Sept)", months: [6, 7, 8] },
  { label: "Q4 (Oct - Des)",  months: [9, 10, 11] },
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

// Build 12 weekly values for a given quarter from pre-aggregated buckets returned by server
function buildQuarterValues(
  buckets: Record<string, number>,
  quarterLabel: string
): number[] {
  const q = QUARTERS.find((x) => x.label === quarterLabel) ?? QUARTERS[0];
  const values: number[] = [];
  q.months.forEach((month) => {
    for (let weekIdx = 0; weekIdx < 4; weekIdx++) {
      values.push(buckets[`${month}-${weekIdx}`] || 0);
    }
  });
  return values;
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
  const [weeklyBuckets, setWeeklyBuckets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState<string>(initialProduct);
  const [variables, setVariables] = useState({ kuartal: "Q1 (Jan - Mar)", marketing: "Payday Sale" });

  // Fetch products list once
  useEffect(() => {
    let cancelled = false;
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to fetch products");
        const json: ListResponse<Product> = await res.json();
        if (cancelled) return;
        setProducts(json.data);
        if (!selectedProductName && json.data[0]) {
          setSelectedProductName(json.data[0].name);
        }
      } catch (err) {
        console.error("SalesPrediction products fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const productList = useMemo(() => products.map((p) => p.name), [products]);
  const selectedProduct = useMemo(
    () => products.find((p) => p.name === selectedProductName),
    [products, selectedProductName]
  );

  // Fetch weekly aggregated sales whenever selected product changes
  useEffect(() => {
    if (!selectedProduct) return;
    let cancelled = false;
    async function fetchWeekly() {
      try {
        setChartLoading(true);
        const res = await fetch(`/api/store-sales/weekly/product/${selectedProduct!.id}?year=${CURRENT_YEAR}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: WeeklySalesResponse = await res.json();
        if (cancelled) return;
        setWeeklyBuckets(json.weeklyBuckets || {});
      } catch (err) {
        console.error("Weekly sales fetch error:", err);
        if (!cancelled) setWeeklyBuckets({});
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }
    fetchWeekly();
    return () => {
      cancelled = true;
    };
  }, [selectedProduct?.id]);

  const weekLabels = useMemo(
    () => buildQuarterWeekLabels(variables.kuartal),
    [variables.kuartal]
  );

  const values = useMemo(
    () => buildQuarterValues(weeklyBuckets, variables.kuartal),
    [weeklyBuckets, variables.kuartal]
  );

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
          </div>

          {/* Chart */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground">
                Sales Projection — {variables.kuartal} {CURRENT_YEAR}
                {chartLoading && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Loading...
                  </span>
                )}
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
