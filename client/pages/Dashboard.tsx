import { useState, lazy, Suspense } from "react";
import { DollarSign, AlertTriangle, Box, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Layout from "@/components/Layout";

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

export default function Dashboard() {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferDone, setTransferDone] = useState(false);

  const handleExecuteTransfer = () => {
    setTransferDialogOpen(false);
    setTransferDone(true);
    setTimeout(() => setTransferDone(false), 3000);
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Regional Stock Distribution */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
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
            <Suspense fallback={
              <div className="w-full h-64 rounded-xl bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                Loading map...
              </div>
            }>
              <IndonesiaMap />
            </Suspense>
          </div>

          {/* AI Action Alerts */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">AI Action Alerts</h2>
              <a href="#" className="text-sm font-medium text-primary hover:underline">View All</a>
            </div>

            <div className="space-y-4">
              <div className="border border-red-100 bg-red-50 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">Impending Stockout</h3>
                    <p className="text-xs text-muted-foreground mt-1">2m ago</p>
                    <p className="text-sm text-foreground mt-2">
                      Jakarta Warehouse akan kehabisan Wireless Earbuds (SKU 4920) dalam 48 jam.
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

              <div className="border border-yellow-100 bg-yellow-50 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">Demand Spike Detected</h3>
                    <p className="text-xs text-muted-foreground mt-1">1h ago</p>
                    <p className="text-sm text-foreground mt-2">
                      ↑34% predicted demand for Smart Watches next week due to regional promotion.
                    </p>
                    <Button variant="outline" className="w-full mt-3 text-xs h-8">
                      Review Simulation
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border border-gray-700 bg-gray-900 rounded-lg p-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm">Transfer Executed</h3>
                    <p className="text-xs text-gray-500 mt-1">1h ago</p>
                    <p className="text-sm text-gray-300 mt-2">Inventory routing initiated successfully.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Execute Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Transfer Stok</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700">Impending Stockout</p>
              <p className="text-sm text-foreground mt-1">
                Jakarta Warehouse akan kehabisan Wireless Earbuds (SKU 4920) dalam 48 jam.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produk</span>
                <span className="font-semibold">Wireless Earbuds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jumlah Transfer</span>
                <span className="font-semibold">500 units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dari</span>
                <span className="font-semibold">Jakarta Hub</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimasi Tiba</span>
                <span className="font-semibold">2 hari</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Penghematan</span>
                <span className="font-semibold text-green-600">Rp 1.500.000</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Batal</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleExecuteTransfer}>
              ✓ Konfirmasi Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {transferDone && (
        <div className="fixed bottom-8 right-8 bg-gray-900 text-white rounded-lg px-6 py-4 shadow-lg flex items-center gap-3 z-50">
          <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse" />
          <div>
            <p className="font-semibold text-sm">Transfer Sedang Diproses...</p>
            <p className="text-xs text-gray-400">Routing 500 units dari Jakarta Hub</p>
          </div>
        </div>
      )}
    </Layout>
  );
}
