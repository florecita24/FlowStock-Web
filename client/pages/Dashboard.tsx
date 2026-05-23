import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DollarSign, AlertTriangle, Box, TrendingUp,
  AlertCircle, CheckCircle2, Clock,
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
import type { Inventory, ListResponse } from "@shared/api";

const IndonesiaMap = lazy(() => import("@/components/IndonesiaMap"));

const FLOWSTOCK_AI_3_BASE_URL =
  import.meta.env.VITE_FLOWSTOCK_AI_3_BASE_URL?.trim() ||
  "https://fhatikaadr-flowstock-ai-3.hf.space";

type AlertSeverity = "critical" | "warning" | "success";

interface AIActionAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  timeLabel: string;
  productName: string | null;
  sku: string | null;
  warehouseName: string | null;
  currentStock: number | null;
  predictedDemand14d: number | null;
  targetStock: number | null;
  shortage: number | null;
  recommendedAction: "None" | "Transfer" | "Discount" | "Order" | null;
  ctaLabel: string | null;
}

interface AIActionAlertsResponse {
  data: AIActionAlert[];
  total: number;
}

interface DashboardAlert {
  id: string;
  type: AlertSeverity;
  title: string;
  body: string;
  time: string;
  product: string | null;
  warehouse: string | null;
  recommendedAction: "None" | "Transfer" | "Discount" | "Order" | null;
  ctaLabel: string | null;
  shortage: number | null;
}

function mapAIAlert(a: AIActionAlert): DashboardAlert {
  return {
    id: a.id,
    type: a.severity,
    title: a.title,
    body: a.body,
    time: a.timeLabel,
    product: a.productName,
    warehouse: a.warehouseName,
    recommendedAction: a.recommendedAction,
    ctaLabel: a.ctaLabel,
    shortage: a.shortage,
  };
}

function formatCurrency(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function buildAlertsFromInventory(items: Inventory[]): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  // Critical items first
  const critical = items
    .filter((i) => (i.status || "").toLowerCase().includes("critical"))
    .slice(0, 4);

  critical.forEach((i, idx) => {
    const productName = i.products?.name ?? `Product #${i.product_id}`;
    const warehouseName = i.warehouses?.name ?? `Warehouse #${i.warehouse_id}`;
    alerts.push({
      id: `c-${i.id}`,
      type: "critical",
      title: idx === 0 ? "Impending Stockout" : "Low Stock Warning",
      body: `${warehouseName} has only ${i.current_stock} units of ${productName} remaining (shortage of ${i.shortage}).`,
      time: `${(idx + 1) * 2}m ago`,
      product: productName,
      warehouse: warehouseName,
      recommendedAction: "Transfer",
      ctaLabel: "Execute Transfer Now",
      shortage: i.shortage,
    });
  });

  // Overstock items
  const overstock = items
    .filter((i) => (i.status || "").toLowerCase().includes("overstock"))
    .slice(0, 3);

  overstock.forEach((i, idx) => {
    const productName = i.products?.name ?? `Product #${i.product_id}`;
    const warehouseName = i.warehouses?.name ?? `Warehouse #${i.warehouse_id}`;
    alerts.push({
      id: `o-${i.id}`,
      type: "warning",
      title: "Overstock Alert",
      body: `${warehouseName} is holding ${i.current_stock.toLocaleString()} units of ${productName} — capital is locked.`,
      time: `${(idx + 1) * 30}m ago`,
      product: productName,
      warehouse: warehouseName,
      recommendedAction: "Discount",
      ctaLabel: "Review Simulation",
      shortage: null,
    });
  });

  return alerts;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<DashboardAlert | null>(null);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [aiAlerts, setAiAlerts] = useState<DashboardAlert[]>([]);
  const [aiAlertsLoading, setAiAlertsLoading] = useState(true);
  const [aiAlertsError, setAiAlertsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchInventory() {
      try {
        const res = await fetch("/api/inventory");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ListResponse<Inventory> = await res.json();
        if (cancelled) return;
        setInventory(json.data);
      } catch (err) {
        console.error("Failed to fetch dashboard inventory:", err);
      }
    }
    fetchInventory();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch AI Action Alerts from FlowStock AI 3
  useEffect(() => {
    let cancelled = false;
    async function fetchAIAlerts() {
      try {
        setAiAlertsLoading(true);
        setAiAlertsError(null);
        const res = await fetch(
          `${FLOWSTOCK_AI_3_BASE_URL}/api/action-alerts?limit=3`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: AIActionAlertsResponse = await res.json();
        if (cancelled) return;
        setAiAlerts((json.data || []).map(mapAIAlert));
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch AI Action Alerts:", err);
        setAiAlertsError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setAiAlertsLoading(false);
      }
    }
    fetchAIAlerts();
    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = useMemo(() => {
    const totalValue = inventory.reduce((sum, i) => {
      const price = i.products?.price ?? 0;
      return sum + price * (i.current_stock || 0);
    }, 0);

    const criticalCount = inventory.filter((i) =>
      (i.status || "").toLowerCase().includes("critical")
    ).length;

    const overstockCount = inventory.filter((i) =>
      (i.status || "").toLowerCase().includes("overstock")
    ).length;

    const totalStock = inventory.reduce((sum, i) => sum + (i.current_stock || 0), 0);
    const totalDemand = inventory.reduce((sum, i) => sum + (i.predicted_demand || 0), 0);
    const growthPct =
      totalStock > 0
        ? (((totalDemand - totalStock) / totalStock) * 100).toFixed(1)
        : "0";

    return [
      {
        title: "Total Inventory Value",
        value: formatCurrency(totalValue),
        badge: "+2.4%",
        badgeColor: "bg-green-100 text-green-700",
        sub: "vs last month",
        icon: <DollarSign className="w-5 h-5 text-orange-500" />,
        iconBg: "bg-orange-100",
        dot: false,
      },
      {
        title: "Stockout Risk",
        value: `${criticalCount} Items`,
        badge: criticalCount > 0 ? "Critical" : "Healthy",
        badgeColor:
          criticalCount > 0
            ? "bg-red-100 text-red-600"
            : "bg-green-100 text-green-700",
        sub: criticalCount > 0 ? "Action required" : "All clear",
        dot: criticalCount > 0,
        icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
        iconBg: "bg-red-100",
      },
      {
        title: "Overstock Warning",
        value: `${overstockCount} Items`,
        badge: overstockCount > 0 ? "Review" : "Healthy",
        badgeColor:
          overstockCount > 0
            ? "bg-orange-100 text-orange-600"
            : "bg-green-100 text-green-700",
        sub: overstockCount > 0 ? "Capital locked" : "Optimal",
        icon: <Box className="w-5 h-5 text-amber-600" />,
        iconBg: "bg-amber-100",
        dot: false,
      },
      {
        title: "Sales Trend Prediction",
        value: `${Number(growthPct) >= 0 ? "+" : ""}${growthPct}%`,
        badge: null as string | null,
        badgeColor: "",
        sub: "Demand vs current stock",
        icon: <TrendingUp className="w-5 h-5 text-purple-600" />,
        iconBg: "bg-purple-100",
        dot: false,
      },
    ];
  }, [inventory]);

  // Prefer AI alerts when available; fall back to inventory-derived alerts if the AI service fails
  const inventoryAlerts = useMemo(
    () => buildAlertsFromInventory(inventory),
    [inventory]
  );

  const allAlerts = useMemo(() => {
    if (aiAlerts.length > 0) return aiAlerts;
    return inventoryAlerts;
  }, [aiAlerts, inventoryAlerts]);

  const topAlerts = allAlerts.slice(0, 2);

  const handleConfirmTransfer = () => {
    setTransferDialogOpen(false);
    toast.success("Transfer initiated successfully", {
      description: "Routing inventory from the source warehouse.",
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
              {aiAlertsLoading && (
                <p className="text-sm text-muted-foreground animate-pulse">
                  Loading AI action alerts...
                </p>
              )}
              {aiAlertsError && aiAlerts.length === 0 && inventoryAlerts.length === 0 && (
                <p className="text-sm text-red-600">
                  AI service unavailable: {aiAlertsError}
                </p>
              )}
              {!aiAlertsLoading && topAlerts.length === 0 && !aiAlertsError && (
                <p className="text-sm text-muted-foreground">
                  No active alerts. All inventory is healthy.
                </p>
              )}
              {topAlerts.map((alert) => {
                const isCritical = alert.type === "critical";
                const isWarning = alert.type === "warning";
                const ctaLabel =
                  alert.ctaLabel ??
                  (isCritical
                    ? "Execute Transfer Now"
                    : alert.recommendedAction === "Discount"
                      ? "Review Simulation"
                      : "View Details");

                const handleCta = () => {
                  if (alert.recommendedAction === "Transfer" || isCritical) {
                    setSelectedAlert(alert);
                    setTransferDialogOpen(true);
                  } else if (alert.product) {
                    handleReviewSimulation(alert.product);
                  }
                };

                return (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-4 ${
                      isCritical
                        ? "border-red-100 bg-red-50"
                        : isWarning
                          ? "border-yellow-100 bg-yellow-50"
                          : "border-green-100 bg-green-50"
                    }`}
                  >
                    <div className="flex gap-3">
                      {alert.type === "success" ? (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
                      ) : (
                        <AlertCircle
                          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            isCritical ? "text-red-500" : "text-yellow-600"
                          }`}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm">
                          {alert.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {alert.time}
                        </p>
                        <p className="text-sm text-foreground mt-2">
                          {alert.body}
                        </p>
                        {alert.type !== "success" && (
                          <Button
                            variant={isCritical ? "default" : "outline"}
                            className={
                              isCritical
                                ? "w-full mt-3 bg-primary text-white text-xs h-8 hover:bg-orange-500"
                                : "w-full mt-3 text-xs h-8"
                            }
                            onClick={handleCta}
                          >
                            {ctaLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Execute Transfer Dialog ── */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Stock Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedAlert && selectedAlert.type === "critical" ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-700">{selectedAlert.title}</p>
                  <p className="text-sm text-foreground mt-1">{selectedAlert.body}</p>
                </div>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product</span>
                    <span className="font-semibold">{selectedAlert.product ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Warehouse</span>
                    <span className="font-semibold">{selectedAlert.warehouse ?? "-"}</span>
                  </div>
                  {selectedAlert.shortage != null && selectedAlert.shortage > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transfer Amount</span>
                      <span className="font-semibold">
                        {selectedAlert.shortage.toLocaleString()} units
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Arrival</span>
                    <span className="font-semibold">2 days</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No active stockout to transfer.</p>
            )}
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
        <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto bg-white text-foreground">
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
                               "border-green-100 bg-green-50"
                  }`}
                >
                  <div className="flex gap-3">
                    {isDark
                      ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      : <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isRed ? "text-red-500" : "text-yellow-600"}`} />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold text-sm ${isDark ? "text-foreground" : "text-foreground"}`}>
                          {alert.title}
                        </h3>
                        <div className={`flex items-center gap-1 text-xs ${isDark ? "text-muted-foreground" : "text-muted-foreground"}`}>
                          <Clock className="w-3 h-3" />
                          {alert.time}
                        </div>
                      </div>
                      <p className={`text-sm mt-1.5 ${isDark ? "text-foreground" : "text-foreground"}`}>
                        {alert.body}
                      </p>
                      {alert.type !== "success" && (() => {
                        const ctaLabel =
                          alert.ctaLabel ??
                          (isRed
                            ? "Execute Transfer Now"
                            : alert.recommendedAction === "Discount"
                              ? "Review Simulation"
                              : "View Details");
                        const handleCta = () => {
                          setViewAllOpen(false);
                          if (alert.recommendedAction === "Transfer" || isRed) {
                            setSelectedAlert(alert);
                            setTransferDialogOpen(true);
                          } else if (alert.product) {
                            handleReviewSimulation(alert.product);
                          }
                        };
                        return (
                          <Button
                            size="sm"
                            variant={isRed ? "default" : "outline"}
                            className={
                              isRed
                                ? "mt-3 text-xs h-7 w-full bg-primary text-white"
                                : "mt-3 text-xs h-7"
                            }
                            onClick={handleCta}
                          >
                            {ctaLabel}
                          </Button>
                        );
                      })()}
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
