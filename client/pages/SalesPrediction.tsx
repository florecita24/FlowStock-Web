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

// Forecast API (sales prediction)
const FORECAST_API_BASE_URL =
  import.meta.env.VITE_SALES_FORECAST_BASE_URL?.trim() ||
  "https://naraurst-sales-prediction.hf.space";

interface ForecastDataPoint {
  date: string;
  predicted_sales: number;
}

interface WeeklyForecastPoint {
  week: string;
  predicted_sales: number;
}

interface HistoricalDataPoint {
  date: string;
  sales: number;
}

interface ForecastMetrics {
  mae: number;
  mse: number;
  rmse: number;
  medae: number;
  mape: number;
  smape: number;
  r2: number;
  evs: number;
}

interface ForecastInsight {
  summary: string;
  stockout_risk: string;
  peak_week: string | null;
  peak_sales: number | null;
  recommended_safety_stock: string;
  recommended_action: string;
  bullets: string[] | null;
}

interface ForecastResponse {
  status: string;
  selected_model: string;
  metrics: ForecastMetrics;
  forecast: ForecastDataPoint[];
  weekly_forecast: WeeklyForecastPoint[];
  historical: HistoricalDataPoint[];
  insight: ForecastInsight;
}

interface AIInsightResponse {
  summary: string;
  stockout_risk: string;
  peak_week: string | null;
  peak_sales: number | null;
  recommended_safety_stock: string;
  recommended_action: string;
  bullets: string[];
  source: string;
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
            {p.value?.toLocaleString("id-ID")} units
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

  // AI Forecast & Insight state (from naraurst-sales-prediction API)
  const [forecastMetrics, setForecastMetrics] = useState<ForecastMetrics | null>(null);
  const [aiInsight, setAiInsight] = useState<AIInsightResponse | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  // Full forecast response stored so we can re-slice per month without re-running
  const [fullForecast, setFullForecast] = useState<ForecastResponse | null>(null);

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

  // ── Effect 1: Fetch historical + full-year forecast when product changes ────
  useEffect(() => {
    if (!selectedProduct) return;
    let cancelled = false;

    async function runForecast(productId: number): Promise<ForecastResponse> {
      const r = await fetch(`${FORECAST_API_BASE_URL}/forecast/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: productId,
          model: "xgboost",
          forecast_period_days: 365,
        }),
      });
      if (!r.ok) {
        const errJson = await r.json().catch(() => ({}));
        throw new Error(errJson.detail || `Forecast HTTP ${r.status}`);
      }
      return await r.json();
    }

    async function fetchAll() {
      try {
        setChartLoading(true);
        setInsightLoading(true);
        setInsightError(null);
        setFullForecast(null);
        setAiInsight(null);

        const [histRes, forecastJson] = await Promise.all([
          fetch(`/api/store-sales/weekly/product/${selectedProduct!.id}?year=${HISTORICAL_YEAR}`),
          runForecast(selectedProduct!.id),
        ]);

        if (!histRes.ok) throw new Error(`Historical fetch failed: HTTP ${histRes.status}`);

        const histJson: WeeklySalesResponse = await histRes.json();
        if (cancelled) return;

        setHistWeekly(histJson.weeklyBuckets || {});
        setHistDaily(histJson.dailyBuckets || {});
        setForecastMetrics(forecastJson.metrics ?? null);

        // Convert AI forecast (daily date points) into our bucket format.
        // Round each prediction up to a whole unit so the UI never shows fractional sales.
        const predWeeklyBuckets: Record<string, number> = {};
        const predDailyBuckets: Record<string, number> = {};
        for (const pt of forecastJson.forecast || []) {
          const d = new Date(pt.date);
          if (isNaN(d.getTime())) continue;
          const month = d.getMonth();
          const day = d.getDate();
          const weekIdx = Math.min(3, Math.floor((day - 1) / 7));
          const weeklyKey = `${month}-${weekIdx}`;
          const dailyKey = `${month}-${day}`;
          const value = Math.ceil(pt.predicted_sales || 0);
          predWeeklyBuckets[weeklyKey] = (predWeeklyBuckets[weeklyKey] || 0) + value;
          predDailyBuckets[dailyKey] = (predDailyBuckets[dailyKey] || 0) + value;
        }
        setPredWeekly(predWeeklyBuckets);
        setPredDaily(predDailyBuckets);

        // Store full forecast — Effect 2 will immediately fire to generate the insight
        if (!cancelled) setFullForecast(forecastJson);
      } catch (err) {
        console.error("SalesPrediction fetch error:", err);
        if (!cancelled) {
          setHistWeekly({});
          setPredWeekly({});
          setHistDaily({});
          setPredDaily({});
          setForecastMetrics(null);
          setAiInsight(null);
          setInsightError(err instanceof Error ? err.message : String(err));
          setInsightLoading(false);
        }
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [selectedProduct?.id]);

  // ── Effect 2: Re-infer AI insight whenever the selected month changes ────────
  // Filters the stored daily forecast to the selected month so the LLM always
  // reasons about exactly the data visible in the chart.
  useEffect(() => {
    if (!fullForecast || !selectedProduct) return;
    let cancelled = false;

    setInsightLoading(true);
    setInsightError(null);

    // Filter daily forecast points to the selected month (or keep all for "All months")
    const monthIdx = MONTH_OPTIONS.indexOf(selectedMonth) - 1; // 0-based; -1 = "All months"
    const filteredForecast: ForecastDataPoint[] =
      selectedMonth === "All months"
        ? fullForecast.forecast
        : fullForecast.forecast.filter((pt) => {
            const d = new Date(pt.date);
            return !isNaN(d.getTime()) && d.getMonth() === monthIdx;
          });

    // Filter historical to same month for a fair comparison baseline
    const filteredHistorical: HistoricalDataPoint[] =
      selectedMonth === "All months"
        ? fullForecast.historical
        : fullForecast.historical.filter((pt) => {
            const d = new Date(pt.date);
            return !isNaN(d.getTime()) && d.getMonth() === monthIdx;
          });

    fetch(`${FORECAST_API_BASE_URL}/forecast/ai-insight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item: selectedProduct.id,
        product_name: selectedProduct.name,   // real name from Supabase, e.g. "Vanilla Ice Cream"
        month_label: selectedMonth,
        forecast: filteredForecast,
        historical: filteredHistorical,
        metrics: fullForecast.metrics,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`AI insight HTTP ${r.status}`);
        return r.json();
      })
      .then((insight: AIInsightResponse) => {
        if (cancelled) return;
        setAiInsight(insight);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("AI insight fetch error:", err);
        // Fallback: use insight embedded in the /forecast/run response
        const fallback: AIInsightResponse = {
          ...fullForecast.insight,
          bullets: fullForecast.insight.bullets || [],
          source: "fallback",
        };
        setAiInsight(fallback);
        setInsightError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setInsightLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMonth, selectedProduct?.id, fullForecast]);

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
            Sales Prediction
          </h1>
          <p className="text-sm text-foreground mt-1">
            View future sales trends with the AI Prediction Engine.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              <div className="flex items-center gap-3">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>

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

            <ResponsiveContainer width="100%" height={480}>
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
                  {peakInfo.maxVal.toLocaleString("id-ID")} units
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
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="font-bold text-foreground">AI Insight</h3>
                {/* Month context pill */}
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                  {selectedMonth}
                </span>
                {aiInsight?.source && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      aiInsight.source === "llm"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {aiInsight.source === "llm" ? "LLM (Qwen)" : aiInsight.source}
                  </span>
                )}
                {forecastMetrics && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    MAPE {(forecastMetrics.mape).toFixed(1)}% · R² {forecastMetrics.r2.toFixed(2)}
                  </span>
                )}
              </div>

              {insightLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse">
                  Analyzing {selectedMonth === "All months" ? "full year" : selectedMonth} data...
                </p>
              ) : insightError && !aiInsight ? (
                <p className="text-sm text-red-600">
                  AI insight unavailable: {insightError}
                </p>
              ) : aiInsight ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">
                    {aiInsight.summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                      <p className="text-[11px] font-bold text-orange-700 uppercase tracking-wider mb-1">
                        Stockout Risk
                      </p>
                      <p className="text-sm text-foreground">{aiInsight.stockout_risk}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                        Recommended Safety Stock
                      </p>
                      <p className="text-sm text-foreground">
                        {aiInsight.recommended_safety_stock}
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                    <p className="text-[11px] font-bold text-green-700 uppercase tracking-wider mb-1">
                      Recommended Action
                    </p>
                    <p className="text-sm text-foreground">{aiInsight.recommended_action}</p>
                  </div>

                  {aiInsight.peak_week && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Peak:</span> {aiInsight.peak_week}
                      {aiInsight.peak_sales != null && (
                        <> — {Math.ceil(aiInsight.peak_sales).toLocaleString("id-ID")} units</>
                      )}
                    </p>
                  )}

                  {aiInsight.bullets && aiInsight.bullets.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                      {aiInsight.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Select a product to generate AI insight.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
