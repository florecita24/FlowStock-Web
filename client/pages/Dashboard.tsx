import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DollarSign, AlertTriangle, Box, TrendingUp,
  AlertCircle, CheckCircle2, Clock, BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Layout from "@/components/Layout";

const IndonesiaMap = lazy(() => import("@/components/IndonesiaMap"));

const BACKEND_URL = "http://127.0.0.1:8000";

interface MetricEntry {
  model: string;
  date: string;
  metrics: {
    mae: number; rmse: number; r2: number; mape: number; smape: number;
  };
}

function modelBadgeColor(model: string) {
  const m = model.toLowerCase();
  if (m === "xgboost") return "bg-orange-100 text-orange-700";
  if (m === "prophet") return "bg-blue-100 text-blue-700";
  if (m === "sarima")  return "bg-purple-100 text-purple-700";
  if (m === "lstm")    return "bg-pink-100 text-pink-700";
  if (m === "mlp")     return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
}

function r2Color(r2: number) {
  if (r2 >= 0.75) return "text-green-600 font-bold";
  if (r2 >= 0.5)  return "text-orange-500 font-bold";
  return "text-red-500 font-bold";
}

const statCards = [
  {
    title: "Total Inventory Value",
    value: "$4,250,890",
    badge: "+2.4%",
    badgeColor: "bg-green-100 text-green-700",
    sub: "vs last month",
    icon: <DollarSign className="w-5 h-5 text-orange-500" />,
    iconBg: "bg-orange-100",
  },
  {
    title: "Stockout Risk",
    value: "12 Items",
    badge: "Critical",
    badgeColor: "bg-red-100 text-red-600",
    sub: "Action required",
    dot: true,
    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    iconBg: "bg-red-100",
  },
  {
    title: "Overstock Warning",
    value: "5 Items",
    badge: "Review",
    badgeColor: "bg-orange-100 text-orange-600",
    sub: "Capital locked",
    icon: <Box className="w-5 h-5 text-amber-600" />,
    iconBg: "bg-amber-100",
  },
  {
    title: "Sales Trend Prediction",
    value: "+15.2%",
    badge: null,
    sub: "Expected MoM growth",
    icon: <TrendingUp className="w-5 h-5 text-purple-600" />,
    iconBg: "bg-purple-100",
  },
];

const allAlerts = [
  {
    id: "1",
    type: "critical",
    title: "Impending Stockout",
    body: "Jakarta Warehouse will run out of Wireless Earbuds (SKU 4920) in 48 hours.",
    time: "2m ago",
    product: "Wireless Earbuds",
  },
  {
    id: "2",
    type: "warning",
    title: "Demand Spike Detected",
    body: "↑34% predicted demand for Smart Watches next week due to regional promotion.",
    time: "1h ago",
    product: "Smart Watches",
  },
  {
    id: "3",
    type: "success",
    title: "Transfer Executed",
    body: "Inventory routing initiated successfully — 500 units from Jakarta Hub.",
    time: "1h ago",
    product: null,
  },
  {
    id: "4",
    type: "critical",
    title: "Low Stock Warning",
    body: "Denpasar Hub has only 80 units of Serum Vitamin C (SKU: SVC-30) remaining.",
    time: "3h ago",
    product: "Serum Vitamin C",
  },
  {
    id: "5",
    type: "warning",
    title: "Overstock Alert",
    body: "Bandung Hub is holding 2,000 units of Kaos Polos — 5× optimal level.",
    time: "5h ago",
    product: "Kaos Polos",
  },
  {
    id: "6",
    type: "warning",
    title: "Expiry Risk",
    body: "Lipstick Matte (SKU: LM-89) batch in Surabaya Hub expires in 30 days.",
    time: "6h ago",
    product: "Lipstick Matte",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [metricsData, setMetricsData] = useState<MetricEntry[]>([]);

  useEffect(() => {
    fetch(`${BACKEND_URL}/forecast/metrics`)
      .then((r) => r.json())
      .then((data: MetricEntry[]) => setMetricsData(Array.isArray(data) ? data : []))
      .catch(() => { /* backend offline – silently skip */ });
  }, []);

  const handleConfirmTransfer = () => {
    setTransferDialogOpen(false);
    toast.success("Transfer initiated successfully", {
      description: "Routing 500 units of Wireless Earbuds from Jakarta Hub.",
    });
  };

  const handleReviewSimulation = (product: string) => {
    navigate("/sales", { state: { selectedProduct: product } });
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-white mt-1">AI-powered insights and operational metrics.</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => (
            <div key={card.title} className="bg-white rounded-2xl p-6 shadow-sm border border-border">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                  {card.icon}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                {card.value}
                {card.dot && <span className="ml-2 w-2 h-2 inline-block rounded-full bg-red-500" />}
              </h3>
              <div className="flex items-center gap-2">
                {card.badge && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{card.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Regional Stock Distribution */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-border flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg font-bold text-foreground">Regional Stock Distribution</h2>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-xs text-muted-foreground">Healthy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">Critical</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-xs text-muted-foreground">Overstock</span>
                </div>
              </div>
            </div>

            {/* map-isolate keeps Leaflet's z-index contained */}
            <div className="map-isolate flex-1 min-h-0">
              <Suspense fallback={
                <div className="w-full h-full min-h-[240px] rounded-xl bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                  Loading map...
                </div>
              }>
                <IndonesiaMap className="w-full h-full min-h-[240px]" />
              </Suspense>
            </div>
          </div>

          {/* AI Action Alerts */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border flex flex-col">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h2 className="text-lg font-bold text-foreground">AI Action Alerts</h2>
              <button
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => setViewAllOpen(true)}
              >
                View All
              </button>
            </div>

            <div className="space-y-4 flex-1">
              {/* Alert 1 */}
              <div className="border border-red-100 bg-red-50 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">Impending Stockout</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">2m ago</p>
                    <p className="text-sm text-foreground mt-2">
                      Jakarta Warehouse will run out of Wireless Earbuds (SKU 4920) in 48 hours.
                    </p>
                    <Button
                      className="w-full mt-3 bg-primary text-white text-xs h-8 hover:bg-orange-500"
                      onClick={() => setTransferDialogOpen(true)}
                    >
                      Execute Transfer Now
                    </Button>
                  </div>
                </div>
              </div>

              {/* Alert 2 */}
              <div className="border border-yellow-100 bg-yellow-50 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">Demand Spike Detected</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">1h ago</p>
                    <p className="text-sm text-foreground mt-2">
                      ↑34% predicted demand for Smart Watches next week due to regional promotion.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full mt-3 text-xs h-8"
                      onClick={() => handleReviewSimulation("Smart Watches")}
                    >
                      Review Simulation
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Model Performance Comparison ── */}
        {metricsData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Recent Model Performance</h2>
              <span className="ml-auto text-xs text-muted-foreground">Last {metricsData.length} runs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-5 font-semibold text-foreground whitespace-nowrap">Model</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Date</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground whitespace-nowrap">MAE ↓</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground whitespace-nowrap">RMSE ↓</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground whitespace-nowrap">MAPE ↓</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground whitespace-nowrap">sMAPE ↓</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground whitespace-nowrap">R² ↑</th>
                  </tr>
                </thead>
                <tbody>
                  {metricsData.map((entry, i) => (
                    <tr key={i} className="border-b border-border hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${modelBadgeColor(entry.model)}`}>
                          {entry.model}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(entry.date).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-foreground">{entry.metrics.mae.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-foreground">{entry.metrics.rmse.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-foreground">{(entry.metrics.mape * 100).toFixed(1)}%</td>
                      <td className="py-3 px-4 text-right font-mono text-foreground">{(entry.metrics.smape * 100).toFixed(1)}%</td>
                      <td className={`py-3 px-4 text-right font-mono ${r2Color(entry.metrics.r2)}`}>{entry.metrics.r2.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">↓ Lower is better &nbsp;·&nbsp; ↑ Higher is better &nbsp;·&nbsp; R² ≥ 0.75 = <span className="text-green-600 font-semibold">Good</span></p>
            </div>
          </div>
        )}
      </div>

      {/* ── Execute Transfer Dialog ── */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Stock Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700">Impending Stockout</p>
              <p className="text-sm text-foreground mt-1">
                Jakarta Warehouse will run out of Wireless Earbuds (SKU 4920) in 48 hours.
              </p>
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                ["Product",            "Wireless Earbuds"],
                ["Transfer Amount",    "500 units"],
                ["From",               "Jakarta Hub"],
                ["Estimated Arrival",  "2 days"],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold">{val}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Savings</span>
                <span className="font-semibold text-green-600">Rp 1,500,000</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleConfirmTransfer}>
              ✓ Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View All Alerts Sheet ── */}
      <Sheet open={viewAllOpen} onOpenChange={setViewAllOpen}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>All AI Action Alerts</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {allAlerts.map((alert) => {
              const isRed    = alert.type === "critical";
              const isYellow = alert.type === "warning";
              const isDark   = alert.type === "success";
              return (
                <div
                  key={alert.id}
                  className={`rounded-lg p-4 border ${
                    isRed    ? "border-red-100 bg-red-50" :
                    isYellow ? "border-yellow-100 bg-yellow-50" :
                               "border-gray-700 bg-gray-900"
                  }`}
                >
                  <div className="flex gap-3">
                    {isDark
                      ? <CheckCircle2 className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      : <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isRed ? "text-red-500" : "text-yellow-600"}`} />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold text-sm ${isDark ? "text-white" : "text-foreground"}`}>
                          {alert.title}
                        </h3>
                        <div className={`flex items-center gap-1 text-xs ${isDark ? "text-gray-500" : "text-muted-foreground"}`}>
                          <Clock className="w-3 h-3" />
                          {alert.time}
                        </div>
                      </div>
                      <p className={`text-sm mt-1.5 ${isDark ? "text-gray-300" : "text-foreground"}`}>
                        {alert.body}
                      </p>
                      {alert.product && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 text-xs h-7"
                          onClick={() => {
                            setViewAllOpen(false);
                            handleReviewSimulation(alert.product!);
                          }}
                        >
                          View Simulation
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
