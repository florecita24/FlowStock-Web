import { Search, ChevronDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  predictedDemand: number | string;
  predictedDemandShort?: string;
  expiryDate: string;
  status: "Healthy" | "Critical" | "Overstock";
  recommendedAction: string;
  harga: string;
  berat: string;
}

const inventoryData: InventoryItem[] = [
  {
    id: "1",
    name: "Pencil 2B",
    category: "stationery",
    currentStock: 100,
    predictedDemand: "600 (↓600 short)",
    predictedDemandShort: "↓600 short",
    expiryDate: "N/A",
    status: "Critical",
    recommendedAction: "⚡Transfer",
    harga: "Rp 5.000",
    berat: "10g",
  },
  {
    id: "2",
    name: "Wireless Earbuds",
    category: "electronic",
    currentStock: 50,
    predictedDemand: 45,
    expiryDate: "12/2025",
    status: "Healthy",
    recommendedAction: "None",
    harga: "Rp 250.000",
    berat: "85g",
  },
  {
    id: "3",
    name: "Tablet Cases",
    category: "electronic",
    currentStock: 5000,
    predictedDemand: 200,
    expiryDate: "N/A",
    status: "Overstock",
    recommendedAction: "Discount",
    harga: "Rp 120.000",
    berat: "200g",
  },
  {
    id: "4",
    name: "A4 Paper Reams",
    category: "stationery",
    currentStock: 1200,
    predictedDemand: 1150,
    expiryDate: "N/A",
    status: "Healthy",
    recommendedAction: "None",
    harga: "Rp 55.000",
    berat: "2.5kg",
  },
  {
    id: "5",
    name: "Lipstick Matte",
    category: "make up",
    currentStock: 300,
    predictedDemand: 280,
    expiryDate: "06/2026",
    status: "Healthy",
    recommendedAction: "None",
    harga: "Rp 89.000",
    berat: "15g",
  },
  {
    id: "6",
    name: "Serum Vitamin C",
    category: "skincare",
    currentStock: 80,
    predictedDemand: 150,
    expiryDate: "03/2026",
    status: "Critical",
    recommendedAction: "⚡Transfer",
    harga: "Rp 175.000",
    berat: "30g",
  },
  {
    id: "7",
    name: "Kaos Polos",
    category: "fashion",
    currentStock: 2000,
    predictedDemand: 400,
    expiryDate: "N/A",
    status: "Overstock",
    recommendedAction: "Discount",
    harga: "Rp 65.000",
    berat: "200g",
  },
];

const categories = ["All Categories", "Electronic", "Fashion", "Stationery", "Make Up", "Skincare"];

export default function InventoryManagement() {
  const [selectedAlert, setSelectedAlert] = useState<string | null>("1");
  const [showProcessing, setShowProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Critical":
        return "bg-red-100 text-red-700";
      case "Overstock":
        return "bg-orange-100 text-orange-700";
      case "Healthy":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleApproveTransfer = () => {
    setShowProcessing(true);
    setTimeout(() => {
      setShowProcessing(false);
      setSelectedAlert(null);
    }, 2000);
  };

  const filteredData = inventoryData.filter((item) => {
    const matchCategory =
      selectedCategory === "All Categories" ||
      item.category === selectedCategory.toLowerCase();
    const matchSearch =
      searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manajemen Stok</h1>
          <p className="text-sm text-white mt-1">
            Manage inventory levels, respond to alerts, and execute transfers.
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-4 mb-6">
            {/* Filter Dropdowns */}
            <div className="flex gap-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
                All Warehouses
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Category Dropdown */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none flex items-center gap-2 px-4 py-2 pr-8 bg-background border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-foreground" />
              </div>

              <button className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
                All Statuses
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="ml-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search Product Name..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Product Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Current Stock</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Predicted Demand (4 days)</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Harga</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Berat</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Expiry Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-border hover:bg-muted/50 transition-colors",
                      selectedAlert === item.id && "bg-orange-50"
                    )}
                  >
                    <td className="py-4 px-4">
                      <p className="font-semibold text-foreground">{item.name}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-foreground">{item.currentStock}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-foreground">{item.predictedDemand}</p>
                      {item.predictedDemandShort && (
                        <p className="text-xs text-red-600">{item.predictedDemandShort}</p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-foreground">{item.harga}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-foreground">{item.berat}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-foreground">{item.expiryDate}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          "inline-block px-3 py-1 rounded-full text-xs font-semibold",
                          getStatusColor(item.status)
                        )}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">{item.recommendedAction}</span>
                        {item.status === "Critical" && (
                          <Button
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white ml-2"
                            onClick={() => setSelectedAlert(item.id)}
                          >
                            View Solution
                          </Button>
                        )}
                        {item.status !== "Critical" && (
                          <button className="text-primary text-xs font-medium hover:underline">
                            View Solution
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Showing {filteredData.length} of {inventoryData.length} items
          </p>
        </div>

        {/* AI Recommendation Section */}
        {selectedAlert && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                <span className="text-purple-700 font-bold text-sm">AI</span>
              </div>
              <h2 className="text-lg font-bold text-foreground">AI Recommendation</h2>
            </div>

            <div className="space-y-4">
              {/* Transfer Stock Option */}
              <div className="border-2 border-orange-400 rounded-xl p-6 bg-orange-50 relative">
                <div className="absolute -top-3 left-6 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  BEST OPTION
                </div>
                <div className="flex gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">Transfer Stock</h3>
                        <p className="text-sm text-muted-foreground">From Jakarta Hub</p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground mb-3">
                      Sufficient overstock available in Jakarta Hub. Transit time in 2 days, matching impending demand spike exactly.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-orange-600">500 units</p>
                    <p className="text-sm text-muted-foreground">Save Rp 1.500.000</p>
                  </div>
                </div>
              </div>

              {/* Order from Supplier Option */}
              <div className="border border-border rounded-xl p-6">
                <div className="flex gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-bold">📦</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">Order from Supplier</h3>
                        <p className="text-sm text-muted-foreground">Indostationery Ltd.</p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground">
                      Lead time is 4 days. Stockout risk before delivery. Uses additional capital.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-foreground">Rp 1.000.000</p>
                    <p className="text-sm text-muted-foreground">inc. 7.000/unit</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-border">
              <button className="ml-auto px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Order from Supplier
              </button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleApproveTransfer}
              >
                ✓ Approve Transfer
              </Button>
            </div>
          </div>
        )}

        {/* Processing Notification */}
        {showProcessing && (
          <div className="fixed bottom-8 right-8 bg-gray-900 text-white rounded-lg px-6 py-4 shadow-lg flex items-center gap-3 z-50">
            <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse" />
            <div>
              <p className="font-semibold text-sm">Processing Transfer...</p>
              <p className="text-xs text-gray-400">Routing 500 units from Jakarta</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
