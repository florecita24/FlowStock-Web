import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { Lightbulb } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Label,
} from "recharts";
import type { ListResponse, Product } from "@shared/api";

interface WeeklySalesResponse {
  productId: number;
  year: number;
  totalRows: number;
  weeklyBuckets: Record<string, number>; // key: "month-weekIdx"
  dailyBuckets: Record<string, number>;  // key: "month-day" (day = 1-31)
}

// Days in each month (non-leap year, since 2017 & 2018 are not leap years)
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Historical year (real data from DB) vs predicted year (from AI model)
const HISTORICAL_YEAR = 2017;
const PREDICTED_YEAR = 2018;

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_OPTIONS = [
  "All months",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Sum all weekly buckets for a single month
function sumMonth(buckets: Record<string, number>, month: number): number {
  let total = 0;
  for (let w = 0; w < 4; w++) total += buckets[`${month}-${w}`] || 0;
  return total;
}

interface ChartPoint {
  label: string;
  historical: number;
  projection: number;
}

function buildChartData(
  histWeekly: Record<string, number>,
  predWeekly: Record<string, number>,
  histDaily: Record<string, number>,
  predDaily: Record<string, number>,
  monthLabel: string
): ChartPoint[] {
  // "All months" → 12 monthly aggregated points (from weekly buckets)
  if (monthLabel === "All months") {
    return MONTH_SHORT.map((m, i) => ({
      label: m,
      historical: sumMonth(histWeekly, i),
      projection: sumMonth(predWeekly, i),
    }));
  }

  // Specific month → daily points (1, 2, ..., 28/30/31)
  const monthIdx = MONTH_OPTIONS.indexOf(monthLabel) - 1; // -1 because "All months" is at index 0
  if (monthIdx < 0 || monthIdx > 11) return [];

  const daysInMonth = DAYS_IN_MONTH[monthIdx];
  const points: ChartPoint[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    points.push({
      label: String(day),
      historical: histDaily[`${monthIdx}-${day}`] || 0,
      projection: predDaily[`${monthIdx}-${day}`] || 0,
    });
  }
  return points;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-semibold text-base">
          <span
            className="inline-block w-2 h-2 rounded-full mr-2"
            style={{ background: p.color }}
          />
          {p.dataKey === "historical"
            ? `${HISTORICAL_YEAR}: `
            : `${PREDICTED_YEAR} (AI): `}
          <span style={{ color: p.color }}>
            {p.value?.toLocaleString()} units
          </span>
        </p>
      ))}
    </div>
  );
};

export default function SalesPrediction() {
  const location = useLocation();
  const initialProduct = (location.state as any)?.selectedProduct ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [histWeekly, setHistWeekly] = useState<Record<string, number>>({});
  const [predWeekly, setPredWeekly] = useState<Record<string, number>>({});
  const [histDaily, setHistDaily] = useState<Record<string, number>>({});
  const [predDaily, setPredDaily] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState<string>(initialProduct);
  const [selectedMonth, setSelectedMonth] = useState<string>("All months");

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

  // Fetch both historical and predicted year buckets in parallel when product changes
  useEffect(() => {
    if (!selectedProduct) return;
    let cancelled = false;
    async function fetchWeekly() {
      try {
        setChartLoading(true);
        const [histRes, predRes] = await Promise.all([
          fetch(`/api/store-sales/weekly/product/${selectedProduct!.id}?year=${HISTORICAL_YEAR}`),
          fetch(`/api/store-sales/weekly/product/${selectedProduct!.id}?year=${PREDICTED_YEAR}`),
        ]);
        if (!histRes.ok || !predRes.ok) throw new Error("Failed to fetch weekly sales");
        const histJson: WeeklySalesResponse = await histRes.json();
        const predJson: WeeklySalesResponse = await predRes.json();
        if (cancelled) return;
        setHistWeekly(histJson.weeklyBuckets || {});
        setPredWeekly(predJson.weeklyBuckets || {});
        setHistDaily(histJson.dailyBuckets || {});
        setPredDaily(predJson.dailyBuckets || {});
      } catch (err) {
        console.error("Weekly sales fetch error:", err);
        if (!cancelled) {
          setHistWeekly({});
          setPredWeekly({});
          setHistDaily({});
          setPredDaily({});
        }
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }
    fetchWeekly();
    return () => {
      cancelled = true;
    };
  }, [selectedProduct?.id]);

  const chartData = useMemo(
    () => buildChartData(histWeekly, predWeekly, histDaily, predDaily, selectedMonth),
    [histWeekly, predWeekly, histDaily, predDaily, selectedMonth]
  );

  // Peak (combined max across both lines)
  const peakInfo = useMemo(() => {
    if (chartData.length === 0) return null;
    let maxVal = 0;
    let peakLabel = "";
    let peakSeries: "historical" | "projection" = "historical";
    chartData.forEach((d) => {
      if (d.historical > maxVal) {
        maxVal = d.historical;
        peakLabel = d.label;
        peakSeries = "historical";
      }
      if (d.projection > maxVal) {
        maxVal = d.projection;
        peakLabel = d.label;
        peakSeries = "projection";
      }
    });
    return maxVal > 0 ? { maxVal, peakLabel, peakSeries } : null;
  }, [chartData]);

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
                <label className="block text-sm font-semibold text-foreground mb-2">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-primary font-bold">ℹ️</span>
                  <span>
                    Comparing {HISTORICAL_YEAR} (historical) with {PREDICTED_YEAR} (AI projection).
                    Marketing campaign effects are baked into the trained model.
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground">
                Sales Projection — {selectedMonth}
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
                <span className="text-xs text-muted-foreground">
                  Historical Data ({HISTORICAL_YEAR})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0 border-t-2 border-dashed border-green-500" />
                <span className="text-xs text-muted-foreground">
                  AI Projection ({PREDICTED_YEAR})
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 36, right: 24, left: 20, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />

                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={selectedMonth === "All months" ? 0 : -35}
                  textAnchor={selectedMonth === "All months" ? "middle" : "end"}
                  height={selectedMonth === "All months" ? 40 : 65}
                >
                  <Label
                    value={selectedMonth === "All months" ? "Month" : "Day"}
                    position="insideBottom"
                    offset={selectedMonth === "All months" ? -8 : -32}
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

                <Line type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={3}
                  dot={false} activeDot={{ r: 6, fill: "#3b82f6" }} connectNulls={false} />
                <Line type="monotone" dataKey="projection" stroke="#10b981" strokeWidth={2.5}
                  strokeDasharray="6 4" dot={false} activeDot={{ r: 6, fill: "#10b981" }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>

            {peakInfo && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">Highest sales:</span>
                <span
                  className={`text-xs font-semibold ${
                    peakInfo.peakSeries === "historical" ? "text-blue-600" : "text-green-600"
                  }`}
                >
                  {peakInfo.maxVal.toLocaleString()} units
                </span>
                <span className="text-xs text-muted-foreground">
                  on{" "}
                  <span className="font-semibold text-foreground">
                    {selectedMonth === "All months"
                      ? `${peakInfo.peakLabel} ${
                          peakInfo.peakSeries === "historical"
                            ? HISTORICAL_YEAR
                            : PREDICTED_YEAR
                        }`
                      : `${selectedMonth} ${peakInfo.peakLabel}, ${
                          peakInfo.peakSeries === "historical"
                            ? HISTORICAL_YEAR
                            : PREDICTED_YEAR
                        }`}
                  </span>{" "}
                  ({peakInfo.peakSeries === "historical" ? "Historical" : "AI Projection"})
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
                Comparing actual {HISTORICAL_YEAR} sales with the {PREDICTED_YEAR} AI projection
                for{" "}
                <span className="font-semibold text-foreground">
                  {selectedProductName || "selected product"}
                </span>{" "}
                in{" "}
                <span className="font-semibold text-foreground">{selectedMonth}</span>.
                Marketing campaign uplift, seasonality, and promotional effects are computed
                inside the trained forecasting model.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
