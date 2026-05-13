import { useState } from "react";
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
import StatCard from "@/components/StatCard";

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
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-white mt-1">
            AI-powered insights and operational metrics.
          </p>
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Inventory Value"
            value="$4,250,890"
            change="↓2.4% vs last month"
            icon={<DollarSign className="w-6 h-6 text-orange-500" />}
            iconBg="bg-orange-100"
            description="Total value of all stock"
          />
          <StatCard
            title="Stockout Risk"
            value="12 Items"
            change="Critical - Action required"
            trend="down"
            icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
            iconBg="bg-red-100"
            description="Items below safety threshold"
          />
          <StatCard
            title="Overstock Warning"
            value="5 Items"
            change="Review - Capital locked"
            icon={<Box className="w-6 h-6 text-amber-600" />}
            iconBg="bg-amber-100"
            description="Items exceeding optimal levels"
          />
          <StatCard
            title="Sales Trend Prediction"
            value="+15.2%"
            change="Expected MoM growth"
            trend="up"
            icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
            iconBg="bg-purple-100"
            description="Next month forecast"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Regional Stock Distribution */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-border relative">
              <h2 className="text-lg font-bold text-foreground mb-4">
                Regional Stock Distribution
              </h2>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl h-64 flex items-center justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    viewBox="0 0 960 500"
                    className="w-full h-full opacity-20"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <g fill="#E59B3C" opacity="0.3">
                      <path d="M200,100 L400,80 L450,180 L350,250 L200,220 Z" />
                      <path d="M450,150 L600,140 L650,200 L580,250 L450,220 Z" />
                      <path d="M200,250 L400,240 L450,350 L300,380 L150,320 Z" />
                    </g>
                  </svg>
                </div>
                <div className="absolute bottom-6 left-6 bg-black text-white rounded-lg px-4 py-2 text-sm">
                  <div className="font-semibold">Jakarta Hub</div>
                  <div className="text-xs text-gray-300">SKU: 4920</div>
                  <div className="text-xs text-orange-300">2 months</div>
                </div>
                <div className="absolute top-12 left-24 w-3 h-3 bg-orange-500 rounded-full" />
                <div className="absolute top-32 left-40 w-3 h-3 bg-orange-400 rounded-full" />
                <div className="absolute top-20 right-32 w-2 h-2 bg-orange-300 rounded-full" />
              </div>
              <div className="absolute top-6 right-6 flex gap-4 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-xs text-muted-foreground">Healthy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">Critical</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Action Alerts */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">
                AI Action Alerts
              </h2>
              <a href="#" className="text-sm font-medium text-primary hover:underline">
                View All
              </a>
            </div>

            <div className="space-y-4">
              {/* Alert 1: Impending Stockout */}
              <div className="border border-red-100 bg-red-50 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">
                      Impending Stockout
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">2m ago</p>
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

              {/* Alert 2: Demand Spike */}
              <div className="border border-yellow-100 bg-yellow-50 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">
                      Demand Spike Detected
                    </h3>
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

              {/* Alert 3: Transfer Executed */}
              <div className="border border-gray-700 bg-gray-900 rounded-lg p-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm">
                      Transfer Executed
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">1h ago</p>
                    <p className="text-sm text-gray-300 mt-2">
                      Inventory routing initiated successfully.
                    </p>
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
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Batal
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleExecuteTransfer}>
              ✓ Konfirmasi Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
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
