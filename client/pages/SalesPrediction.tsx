import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import {
  Lightbulb, Save, History, ChevronDown, ChevronUp,
  AlertTriangle, TrendingUp, TrendingDown, Minus,
  Loader2, BarChart2, Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Label,
} from "recharts";
import { toast } from "sonner";

// ─── Constants ───────────────────────────────────────────────────────────────

const BACKEND_URL = "http://127.0.0.1:8000";

// Product → { store, item } mapping (backend uses integer IDs)
const productMap: Record<string, { store: number; item: number }> = {
  "Pencil 2B":        { store: 1, item: 1 },
  "Wireless Earbuds": { store: 1, item: 2 },
  "Tablet Cases":     { store: 1, item: 3 },
  "A4 Paper Reams":   { store: 1, item: 4 },
  "Lipstick Matte":   { store: 1, item: 5 },
  "Serum Vitamin C":  { store: 1, item: 6 },
  "Kaos Polos":       { store: 1, item: 7 },
  "Smart Watches":    { store: 1, item: 8 },
  "Foundation":       { store: 1, item: 9 },
};

const productList = Object.keys(productMap);

// Quarter label mappings (frontend ↔ backend)
const quarterLabelMap: Record<string, string> = {
  "Q1 (Jan-Mar)": "Jan - Mar",
  "Q2 (Apr-Jun)": "Apr - Jun",
  "Q3 (Jul-Sep)": "Jul - Sept",
  "Q4 (Oct-Des)": "Oct - Des",
};

// ─── Type Definitions ─────────────────────────────────────────────────────────

interface FormOptions {
  supported_models: string[];
  supported_campaigns: string[];
  supported_quarters: string[];   // "Q1 (Jan-Mar)" etc.
}

interface ForecastMetrics {
  mae: number; mse: number; rmse: number; medae: number;
  mape: number; smape: number; r2: number; evs: number;
}

interface ForecastInsight {
  summary: string;
  stockout_risk: string;
  peak_week: string;
  peak_sales: number;
  recommended_safety_stock: string;
  recommended_action: string;
}

interface WeeklyPoint  { week: string; predicted_sales: number; }
interface DailyPoint   { date: string; sales: number; }
interface ForecastResponse {
  status: string;
  selected_model: string;
  metrics: ForecastMetrics;
  forecast: { date: string; predicted_sales: number }[];
  weekly_forecast: WeeklyPoint[];
  historical: DailyPoint[];
  insight: ForecastInsight;
}

interface HistoryEntry {
  id: number;
  model_used: string;
  forecast_date: string;
  insight_summary: string;
  metrics: Partial<ForecastMetrics>;
}

interface ChartPoint {
  week: string;
  historical?: number | null;
  projection?: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Aggregate daily sales into weekly buckets keyed like "Oct W1" */
function aggregateDailyToWeekly(daily: DailyPoint[]): WeeklyPoint[] {
  const weekMap: Record<string, number> = {};
  const weekOrder: string[] = [];

  for (const d of daily) {
    const date = new Date(d.date);
    const month = date.toLocaleString("en-US", { month: "short" });
    const day   = date.getDate();
    const wNum  = Math.ceil(day / 7);
    const key   = `${month} W${wNum}`;
    if (!(key in weekMap)) {
      weekMap[key] = 0;
      weekOrder.push(key);
    }
    weekMap[key] += d.sales;
  }

  return weekOrder.map((w) => ({ week: w, predicted_sales: weekMap[w] }));
}

/** Build Recharts data array merging historical weekly + projected weekly */
function buildChartData(
  historicalWeekly: WeeklyPoint[],
  forecastWeekly: WeeklyPoint[],
): ChartPoint[] {
  const histLen = historicalWeekly.length;
  const allWeeks: ChartPoint[] = [];

  historicalWeekly.forEach((w, i) => {
    allWeeks.push({
      week: w.week,
      historical: w.predicted_sales,
      projection: i === histLen - 1 ? w.predicted_sales : null,
    });
  });

  forecastWeekly.forEach((w) => {
    allWeeks.push({
      week: w.week,
      historical: null,
      projection: w.predicted_sales,
    });
  });

  return allWeeks;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const histVal = payload.find((p: any) => p.dataKey === "historical")?.value;
  const projVal = payload.find((p: any) => p.dataKey === "projection")?.value;
  const val = histVal ?? projVal;
  const isProj = histVal == null;
  return (
    <div className="bg-gray-900 text-white rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-gray-300 font-medium">{label} {isProj ? "(Projection)" : "(Historical)"}</p>
      <p className="text-green-400 font-bold text-base mt-0.5">{val?.toLocaleString(undefined, { maximumFractionDigits: 1 })} units</p>
    </div>
  );
};

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
      <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
      <p className={`text-xl font-bold ${good === true ? "text-green-600" : good === false ? "text-red-500" : "text-foreground"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Stockout Risk Badge ──────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: string }) {
  const lower = risk?.toLowerCase();
  if (lower === "high")   return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3" />High Risk</span>;
  if (lower === "medium") return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700"><Minus className="w-3 h-3" />Medium Risk</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"><TrendingUp className="w-3 h-3" />Low Risk</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalesPrediction() {
  const location       = useLocation();
  const initialProduct = (location.state as any)?.selectedProduct ?? "A4 Paper Reams";

  const [selectedProduct, setSelectedProduct] = useState(
    productList.includes(initialProduct) ? initialProduct : "A4 Paper Reams"
  );

  // Form options (fetched from backend)
  const [formOptions, setFormOptions] = useState<FormOptions>({
    supported_models:    ["xgboost", "prophet", "sarima", "mlp", "lstm"],
    supported_campaigns: ["none", "payday sale", "flash sale", "year end sale", "holiday promo", "clearance"],
    supported_quarters:  ["Q1 (Jan-Mar)", "Q2 (Apr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Des)"],
  });

  // Simulator controls
  const [model,            setModel]            = useState("xgboost");
  const [quarter,          setQuarter]          = useState("Q4 (Oct-Des)");
  const [campaign,         setCampaign]         = useState("payday sale");
  const [seasonality,      setSeasonality]      = useState<"Low" | "Medium" | "High">("High");
  const [demandMult,       setDemandMult]       = useState(1.0);
  const [promoEffect,      setPromoEffect]      = useState(1.0);
  const [forecastDays,     setForecastDays]     = useState(90);

  // State
  const [isLoading,        setIsLoading]        = useState(false);
  const [hasRun,           setHasRun]           = useState(false);
  const [chartData,        setChartData]        = useState<ChartPoint[]>([]);
  const [metrics,          setMetrics]          = useState<ForecastMetrics | null>(null);
  const [insight,          setInsight]          = useState<ForecastInsight | null>(null);
  const [cutoffWeek,       setCutoffWeek]       = useState<string | null>(null);
  const [historyEntries,   setHistoryEntries]   = useState<HistoryEntry[]>([]);
  const [historyOpen,      setHistoryOpen]      = useState(false);

  // Save scenario dialog
  const [saveDialogOpen,   setSaveDialogOpen]   = useState(false);
  const [scenarioName,     setScenarioName]     = useState("");
  const [scenarioDesc,     setScenarioDesc]     = useState("");
  const [isSaving,         setIsSaving]         = useState(false);

  // ── Fetch dynamic form options ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`${BACKEND_URL}/forecast/models`)
      .then((r) => r.json())
      .then((data: FormOptions) => setFormOptions(data))
      .catch(() => { /* use defaults */ });
  }, []);

  // ── Fetch prediction history when product changes ───────────────────────────
  const fetchHistory = useCallback(() => {
    const { store, item } = productMap[selectedProduct] ?? { store: 1, item: 1 };
    fetch(`${BACKEND_URL}/forecast/history/${store}/${item}`)
      .then((r) => r.json())
      .then((data: HistoryEntry[]) => setHistoryEntries(Array.isArray(data) ? data.slice(0, 8) : []))
      .catch(() => setHistoryEntries([]));
  }, [selectedProduct]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── Run Simulation ──────────────────────────────────────────────────────────
  const handleRunSimulation = async () => {
    const { store, item } = productMap[selectedProduct] ?? { store: 1, item: 1 };
    const quarterLabel = quarterLabelMap[quarter] ?? quarter;

    const payload = {
      store,
      item,
      model,
      forecast_period_days: forecastDays,
      quarter: quarterLabel,
      seasonality_impact: seasonality,
      demand_multiplier: demandMult,
      campaign: campaign,
      promotional_effect: promoEffect,
    };

    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/forecast/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ForecastResponse = await res.json();

      // Aggregate daily history → weekly
      const histWeekly  = aggregateDailyToWeekly(data.historical);
      const forecastWk  = data.weekly_forecast;

      // Cutoff = last historical week
      const cutoff = histWeekly.length > 0 ? histWeekly[histWeekly.length - 1].week : null;
      setCutoffWeek(cutoff);

      setChartData(buildChartData(histWeekly, forecastWk));
      setMetrics(data.metrics);
      setInsight(data.insight);
      setHasRun(true);

      // Refresh history list
      fetchHistory();
    } catch (err) {
      toast.error("Forecast failed", { description: String(err) });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Save Scenario ──────────────────────────────────────────────────────────
  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) {
      toast.error("Please enter a scenario name");
      return;
    }
    setIsSaving(true);
    const { store, item } = productMap[selectedProduct] ?? { store: 1, item: 1 };
    try {
      const res = await fetch(`${BACKEND_URL}/forecast/scenario/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scenarioName,
          description: scenarioDesc,
          parameters: { store, item, model, quarter, campaign, seasonality_impact: seasonality },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Scenario saved!", { description: scenarioName });
      setSaveDialogOpen(false);
      setScenarioName("");
      setScenarioDesc("");
    } catch (err) {
      toast.error("Failed to save scenario", { description: String(err) });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Select Label Helper ──────────────────────────────────────────────────────
  const capitalize = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Predictive Analytics &amp; What-If Simulator
            </h1>
            <p className="text-sm text-white mt-1">
              Simulate future sales trends with the AI Prediction Engine.
            </p>
          </div>
          {hasRun && (
            <div className="flex gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => { setSaveDialogOpen(true); setScenarioName(`${selectedProduct} – ${quarter}`); }}
              >
                <Save className="w-4 h-4" /> Save Scenario
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setHistoryOpen((v) => !v)}
              >
                <History className="w-4 h-4" />
                History
                {historyOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>
          )}
        </div>

        {/* History Panel */}
        {historyOpen && historyEntries.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Recent Forecasts for {selectedProduct}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {historyEntries.map((h) => (
                <div key={h.id} className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold uppercase text-primary text-xs">{h.model_used}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(h.forecast_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{h.insight_summary}</p>
                  {h.metrics?.r2 != null && (
                    <p className="text-xs font-semibold text-foreground mt-1">R² {h.metrics.r2.toFixed(3)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ── Simulator Controls ── */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center text-purple-700 font-bold text-sm">
                ⚙️
              </div>
              <h2 className="text-lg font-bold text-foreground">Simulator Controls</h2>
            </div>

            <div className="space-y-4 flex-1">
              {/* Product */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Product</label>
                <select
                  id="product-select"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {productList.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>

              {/* ML Model */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">ML Model</label>
                <select
                  id="model-select"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {formOptions.supported_models.map((m) => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Quarter */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Quarter</label>
                <select
                  id="quarter-select"
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {formOptions.supported_quarters.map((q) => (
                    <option key={q} value={q}>{quarterLabelMap[q] ?? q}</option>
                  ))}
                </select>
              </div>

              {/* Marketing Campaign */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Marketing Campaign</label>
                <select
                  id="campaign-select"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {formOptions.supported_campaigns.map((c) => (
                    <option key={c} value={c}>{capitalize(c)}</option>
                  ))}
                </select>
              </div>

              {/* Seasonality */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Seasonality Impact</label>
                <div className="flex gap-2">
                  {(["Low", "Medium", "High"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeasonality(s)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        seasonality === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Demand Multiplier */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Demand Multiplier</label>
                  <span className="text-xs font-bold text-primary">{demandMult.toFixed(1)}×</span>
                </div>
                <input
                  type="range" min={0.5} max={2.0} step={0.1}
                  value={demandMult}
                  onChange={(e) => setDemandMult(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                  <span>0.5×</span><span>2.0×</span>
                </div>
              </div>

              {/* Promotional Effect */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Promotional Effect</label>
                  <span className="text-xs font-bold text-primary">{promoEffect.toFixed(1)}×</span>
                </div>
                <input
                  type="range" min={0.5} max={2.0} step={0.1}
                  value={promoEffect}
                  onChange={(e) => setPromoEffect(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                  <span>0.5×</span><span>2.0×</span>
                </div>
              </div>

              {/* Forecast Period */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Forecast Period</label>
                <div className="flex gap-2">
                  {[30, 60, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setForecastDays(d)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        forecastDays === d
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Info note */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-primary font-bold">ℹ️</span>
                  <span>Model adjusts prediction dynamically based on historical mapping of selected variables.</span>
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-border">
              <Button
                id="run-simulation-btn"
                className="w-full bg-primary text-primary-foreground hover:bg-orange-500 gap-2"
                onClick={handleRunSimulation}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Run Simulation</>
                )}
              </Button>
            </div>
          </div>

          {/* ── Chart ── */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground">
                Sales Projection (1 Quarter — {quarterLabelMap[quarter] ?? quarter})
              </h2>
              <span className="text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                {model.toUpperCase()}
              </span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mb-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-blue-500" />
                <span className="text-xs text-muted-foreground">Historical Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0 border-t-2 border-dashed border-green-500" />
                <span className="text-xs text-muted-foreground">AI Projection</span>
              </div>
              {cutoffWeek && (
                <div className="flex items-center gap-2">
                  <div className="w-px h-4 border-l-2 border-dashed border-gray-400" />
                  <span className="text-xs text-muted-foreground">Today</span>
                </div>
              )}
            </div>

            {/* Chart or empty state */}
            {!hasRun ? (
              <div className="flex flex-col items-center justify-center h-72 text-center text-muted-foreground">
                <BarChart2 className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm font-medium">Configure the parameters and click</p>
                <p className="text-sm"><span className="text-primary font-bold">Run Simulation</span> to see the forecast chart.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={chartData} margin={{ top: 36, right: 24, left: 20, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false} tickLine={false}
                    interval={0} angle={-35} textAnchor="end" height={65}
                  >
                    <Label value="Week" position="insideBottom" offset={-32} style={{ fontSize: 12, fill: "#6b7280", fontWeight: 600 }} />
                  </XAxis>
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                    width={52}
                  >
                    <Label value="Units Sold" angle={-90} position="insideLeft" offset={10} style={{ fontSize: 12, fill: "#6b7280", fontWeight: 600 }} />
                  </YAxis>
                  <Tooltip content={<CustomTooltip />} />

                  {cutoffWeek && (
                    <ReferenceLine
                      x={cutoffWeek}
                      stroke="#d1d5db"
                      strokeDasharray="4 4"
                      label={{ value: "Today", position: "top", fontSize: 11, fill: "#6b7280" }}
                    />
                  )}

                  <Line
                    type="monotone" dataKey="historical"
                    stroke="#3b82f6" strokeWidth={3}
                    dot={false} activeDot={{ r: 6, fill: "#3b82f6" }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone" dataKey="projection"
                    stroke="#10b981" strokeWidth={2.5}
                    strokeDasharray="6 4"
                    dot={false} activeDot={{ r: 6, fill: "#10b981" }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* Peak info */}
            {insight && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">Peak:</span>
                <span className="text-xs font-semibold text-green-600">
                  {insight.peak_week} — {insight.peak_sales.toLocaleString(undefined, { maximumFractionDigits: 0 })} units
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Metrics Cards (shown after run) ── */}
        {metrics && (
          <div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Model Evaluation Metrics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <MetricCard label="MAE"   value={metrics.mae.toFixed(2)}   sub="Mean Abs Error"       />
              <MetricCard label="RMSE"  value={metrics.rmse.toFixed(2)}  sub="Root Mean Sq Error"   />
              <MetricCard label="MSE"   value={metrics.mse.toFixed(2)}   sub="Mean Sq Error"        />
              <MetricCard label="MedAE" value={metrics.medae.toFixed(2)} sub="Median Abs Error"     />
              <MetricCard label="MAPE"  value={`${(metrics.mape * 100).toFixed(1)}%`} sub="Mean Abs % Error" />
              <MetricCard label="sMAPE" value={`${(metrics.smape * 100).toFixed(1)}%`} sub="Symmetric MAPE" />
              <MetricCard label="R²"    value={metrics.r2.toFixed(3)}    sub="Fit Quality" good={metrics.r2 >= 0.7} />
              <MetricCard label="EVS"   value={metrics.evs.toFixed(3)}   sub="Explained Var Score" good={metrics.evs >= 0.7} />
            </div>
          </div>
        )}

        {/* ── AI Insight (shown after run) ── */}
        {insight && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-pink-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-6 h-6 text-pink-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-bold text-foreground">AI Insight</h3>
                  <RiskBadge risk={insight.stockout_risk} />
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{insight.summary}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">📈 Peak Week</p>
                    <p className="text-sm font-semibold text-foreground">{insight.peak_week}</p>
                    <p className="text-xs text-green-600 font-bold">{insight.peak_sales.toLocaleString(undefined, { maximumFractionDigits: 0 })} units</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">🔒 Safety Stock</p>
                    <p className="text-sm font-semibold text-foreground">{insight.recommended_safety_stock}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">🚀 Recommended Action</p>
                    <p className="text-sm font-semibold text-foreground">{insight.recommended_action}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Save Scenario Dialog ── */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Simulation Scenario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Scenario Name *</label>
              <input
                id="scenario-name-input"
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g. Payday Q4 – XGBoost"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Description</label>
              <textarea
                id="scenario-desc-input"
                value={scenarioDesc}
                onChange={(e) => setScenarioDesc(e.target.value)}
                rows={3}
                placeholder="Optional notes about this scenario..."
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p><span className="font-semibold text-foreground">Product:</span> {selectedProduct}</p>
              <p><span className="font-semibold text-foreground">Model:</span> {model.toUpperCase()}</p>
              <p><span className="font-semibold text-foreground">Quarter:</span> {quarterLabelMap[quarter] ?? quarter}</p>
              <p><span className="font-semibold text-foreground">Campaign:</span> {capitalize(campaign)}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
              onClick={handleSaveScenario}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Scenario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
