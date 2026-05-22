import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DollarSign, AlertTriangle, Box, TrendingUp,
  AlertCircle, CheckCircle2, Clock, Loader2,
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
import { fetchActionAlertsApi } from "@/lib/ai-api";
import {
  AIActionAlert,
  AIActionAlertsResponse,
} from "@shared/api";

const IndonesiaMap = lazy(() => import("@/components/IndonesiaMap"));

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

const legacyAlertCards: AIActionAlert[] = [];

function alertCardStyle(severity: AIActionAlert["severity"]) {
  if (severity === "critical") {
    return {
      wrapper: "border border-red-100 bg-red-50",
      icon: "text-red-500",
      title: "text-foreground",
      body: "text-foreground",
      time: "text-muted-foreground",
      buttonVariant: "default" as const,
      success: false,
    };
  }

  if (severity === "warning") {
    return {
      wrapper: "border border-yellow-100 bg-yellow-50",
      icon: "text-yellow-600",
      title: "text-foreground",
      body: "text-foreground",
      time: "text-muted-foreground",
      buttonVariant: "outline" as const,
      success: false,
    };
  }

  return {
    wrapper: "bg-slate-900 border border-slate-800",
    icon: "text-slate-400",
    title: "text-white",
    body: "text-slate-300",
    time: "text-slate-500",
    buttonVariant: "secondary" as const,
    success: true,
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [alerts, setAlerts] = useState<AIActionAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [selectedTransferAlert, setSelectedTransferAlert] = useState<AIActionAlert | null>(null);
  const [executionAlert, setExecutionAlert] = useState<AIActionAlert | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadAlerts = async () => {
      try {
        setLoadingAlerts(true);
        const response = await fetchActionAlertsApi("/api/action-alerts", undefined, "/api/action-alerts");
        if (!response.ok) {
          throw new Error("Failed to load AI action alerts");
        }

        const data: AIActionAlertsResponse = await response.json();
        if (!isActive) return;
        setAlerts(data.data);
      } catch (error) {
        console.error("Error loading AI action alerts:", error);
        if (isActive) {
          setAlerts(legacyAlertCards);
        }
        toast.error("Failed to load AI Action Alerts", {
          description: "Using fallback dashboard alerts.",
        });
      } finally {
        if (isActive) {
          setLoadingAlerts(false);
        }
      }
    };

    loadAlerts();

    return () => {
      isActive = false;
    };
  }, []);

  const visibleAlerts = executionAlert ? [executionAlert, ...alerts] : alerts;
  const featuredAlerts = visibleAlerts.length > 0 ? visibleAlerts.slice(0, 2) : legacyAlertCards.slice(0, 2);
  const sheetAlerts = visibleAlerts.length > 0 ? visibleAlerts : legacyAlertCards;

  const handleConfirmTransfer = () => {
    setTransferDialogOpen(false);
    const shortage = selectedTransferAlert?.shortage ?? 500;
    const productName = selectedTransferAlert?.productName ?? "Wireless Earbuds";
    const warehouseName = selectedTransferAlert?.warehouseName ?? "Jakarta Hub";

    setExecutionAlert({
      id: `executed-${selectedTransferAlert?.id ?? "manual"}`,
      severity: "success",
      title: "Transfer Executed",
      body: `Inventory routing initiated successfully — ${shortage} units for ${productName} from ${warehouseName}.`,
      timeLabel: "Just now",
      productName,
      warehouseName,
      shortage,
      ctaLabel: "View Simulation",
    });

    toast.success("Transfer initiated successfully", {
      description: `Routing ${shortage} units of ${productName} from ${warehouseName}.`,
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
              {loadingAlerts ? (
                <div className="min-h-[260px] flex items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading AI alerts...
                </div>
              ) : featuredAlerts.length > 0 ? (
                featuredAlerts.map((alert) => {
                  const styles = alertCardStyle(alert.severity);
                  return (
                    <div key={alert.id} className={`rounded-2xl p-4 ${styles.wrapper}`}>
                      <div className="flex gap-3">
                        {styles.success ? (
                          <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
                        ) : (
                          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className={`font-semibold text-sm ${styles.title}`}>{alert.title}</h3>
                            <div className={`flex items-center gap-1 text-xs whitespace-nowrap ${styles.time}`}>
                              <Clock className="w-3 h-3" />
                              {alert.timeLabel}
                            </div>
                          </div>
                          <p className={`text-sm mt-2 leading-6 ${styles.body}`}>{alert.body}</p>
                          <Button
                            className={`w-full mt-3 text-xs h-9 ${alert.severity === "critical" ? "bg-primary text-white hover:bg-orange-500" : ""}`}
                            variant={styles.buttonVariant}
                            onClick={() => {
                              if (alert.recommendedAction === "Transfer" || alert.ctaLabel?.toLowerCase().includes("transfer")) {
                                setSelectedTransferAlert(alert);
                                setTransferDialogOpen(true);
                                return;
                              }

                              handleReviewSimulation(alert.productName ?? "Inventory");
                            }}
                          >
                            {alert.ctaLabel ?? "View Simulation"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                legacyAlertCards.slice(0, 2).map((alert) => {
                  const isRed = alert.severity === "critical";
                  const isYellow = alert.severity === "warning";
                  const isDark = alert.severity === "success";
                  return (
                    <div
                      key={alert.id}
                      className={`rounded-2xl p-4 border ${
                        isRed
                          ? "border-red-100 bg-red-50"
                          : isYellow
                            ? "border-yellow-100 bg-yellow-50"
                            : "border-gray-700 bg-gray-900"
                      }`}
                    >
                      <div className="flex gap-3">
                        {isDark ? (
                          <CheckCircle2 className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isRed ? "text-red-500" : "text-yellow-600"}`} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className={`font-semibold text-sm ${isDark ? "text-white" : "text-foreground"}`}>
                              {alert.title}
                            </h3>
                            <div className={`flex items-center gap-1 text-xs whitespace-nowrap ${isDark ? "text-gray-500" : "text-muted-foreground"}`}>
                              <Clock className="w-3 h-3" />
                              {alert.timeLabel}
                            </div>
                          </div>
                          <p className={`text-sm mt-2 leading-6 ${isDark ? "text-gray-300" : "text-foreground"}`}>
                            {alert.body}
                          </p>
                          {alert.productName && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-3 text-xs h-7"
                              onClick={() => {
                                if (alert.recommendedAction === "Transfer") {
                                  setSelectedTransferAlert({
                                    id: alert.id,
                                    severity: "critical",
                                    title: alert.title,
                                    body: alert.body,
                                    timeLabel: alert.timeLabel,
                                    productName: alert.productName ?? "Wireless Earbuds",
                                    sku: "4920",
                                    warehouseName: alert.warehouseName ?? "Jakarta Hub",
                                    shortage: alert.shortage ?? 500,
                                    ctaLabel: "Execute Transfer Now",
                                  });
                                  setTransferDialogOpen(true);
                                  return;
                                }
                                handleReviewSimulation(alert.productName!);
                              }}
                            >
                              {alert.recommendedAction === "Transfer" ? "Execute Transfer Now" : "View Simulation"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700">Impending Stockout</p>
              <p className="text-sm text-foreground mt-1">
                {selectedTransferAlert?.warehouseName ?? "Jakarta Hub"} will run out of {selectedTransferAlert?.productName ?? "Wireless Earbuds"} (SKU {selectedTransferAlert?.sku ?? "4920"}) unless the transfer is executed.
              </p>
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                ["Product",            selectedTransferAlert?.productName ?? "Wireless Earbuds"],
                ["Transfer Amount",    `${Math.max(selectedTransferAlert?.shortage ?? 500, 1)} units`],
                ["From",               selectedTransferAlert?.warehouseName ?? "Jakarta Hub"],
                ["Estimated Arrival",  "2 days"],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold">{val}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Savings</span>
                <span className="font-semibold text-green-600">Rp {Math.max(selectedTransferAlert?.shortage ?? 500, 1) * 3000}</span>
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
            {sheetAlerts.map((alert) => {
              const styles = alertCardStyle(alert.severity);
              return (
                <div
                  key={alert.id}
                  className={`rounded-2xl p-4 border ${styles.wrapper}`}
                >
                  <div className="flex gap-3">
                    {styles.success
                      ? <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
                      : <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className={`font-semibold text-sm ${styles.title}`}>
                          {alert.title}
                        </h3>
                        <div className={`flex items-center gap-1 text-xs whitespace-nowrap ${styles.time}`}>
                          <Clock className="w-3 h-3" />
                          {alert.timeLabel}
                        </div>
                      </div>
                      <p className={`text-sm mt-2 leading-6 ${styles.body}`}>
                        {alert.body}
                      </p>
                      {alert.productName && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 text-xs h-7"
                          onClick={() => {
                            setViewAllOpen(false);
                            if (alert.recommendedAction === "Transfer") {
                              setSelectedTransferAlert(alert);
                              setTransferDialogOpen(true);
                              return;
                            }

                            handleReviewSimulation(alert.productName!);
                          }}
                        >
                          {alert.ctaLabel ?? "View Simulation"}
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
