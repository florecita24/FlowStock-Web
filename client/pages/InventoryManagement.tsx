import { Search, ChevronDown, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  name: string;
  warehouse: string;
  category: string;
  currentStock: number;
  predictedDemand: number;
  shortage?: number;
  expiryDate: string;
  status: "Healthy" | "Critical" | "Overstock";
  recommendedAction: string;
  harga: string;
  berat: string;
}

const inventoryData: InventoryItem[] = [
  { id:"1", name:"Pencil 2B",        warehouse:"jakarta",  category:"stationery", currentStock:100,  predictedDemand:600,  shortage:500,  expiryDate:"N/A",     status:"Critical",  recommendedAction:"⚡ Transfer", harga:"Rp 5,000",    berat:"10g"   },
  { id:"2", name:"Wireless Earbuds", warehouse:"jakarta",  category:"electronic", currentStock:50,   predictedDemand:45,                 expiryDate:"12/2025", status:"Healthy",   recommendedAction:"None",       harga:"Rp 250,000",  berat:"85g"   },
  { id:"3", name:"Tablet Cases",     warehouse:"bandung",  category:"electronic", currentStock:5000, predictedDemand:200,                expiryDate:"N/A",     status:"Overstock", recommendedAction:"Discount",   harga:"Rp 120,000",  berat:"200g"  },
  { id:"4", name:"A4 Paper Reams",   warehouse:"semarang", category:"stationery", currentStock:1200, predictedDemand:1150,               expiryDate:"N/A",     status:"Healthy",   recommendedAction:"None",       harga:"Rp 55,000",   berat:"2.5kg" },
  { id:"5", name:"Lipstick Matte",   warehouse:"surabaya", category:"make up",    currentStock:300,  predictedDemand:280,                expiryDate:"06/2026", status:"Healthy",   recommendedAction:"None",       harga:"Rp 89,000",   berat:"15g"   },
  { id:"6", name:"Serum Vitamin C",  warehouse:"denpasar", category:"skincare",   currentStock:80,   predictedDemand:150,  shortage:70,   expiryDate:"03/2026", status:"Critical",  recommendedAction:"⚡ Transfer", harga:"Rp 175,000",  berat:"30g"   },
  { id:"7", name:"Kaos Polos",       warehouse:"makassar", category:"fashion",    currentStock:2000, predictedDemand:400,                expiryDate:"N/A",     status:"Overstock", recommendedAction:"Discount",   harga:"Rp 65,000",   berat:"200g"  },
  { id:"8", name:"Smart Watches",    warehouse:"jakarta",  category:"electronic", currentStock:120,  predictedDemand:200,  shortage:80,   expiryDate:"N/A",     status:"Critical",  recommendedAction:"⚡ Transfer", harga:"Rp 850,000",  berat:"120g"  },
  { id:"9", name:"Foundation",       warehouse:"medan",    category:"make up",    currentStock:450,  predictedDemand:420,                expiryDate:"09/2026", status:"Healthy",   recommendedAction:"None",       harga:"Rp 145,000",  berat:"30g"   },
];

const warehouses   = ["All Warehouses", "Jakarta", "Bandung", "Semarang", "Surabaya", "Denpasar", "Makassar", "Medan"];
const categories   = ["All Categories", "Electronic", "Fashion", "Stationery", "Make Up", "Skincare"];
const statuses     = ["All Statuses", "Critical", "Healthy", "Overstock"];

function statusColor(s: string) {
  if (s === "Critical")  return "bg-red-100 text-red-700";
  if (s === "Overstock") return "bg-orange-100 text-orange-700";
  return "bg-green-100 text-green-700";
}

function FilterSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none px-4 py-2 pr-8 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
    </div>
  );
}

function AIRecommendationPanel({ item, onApprove, onSupplier, onClose }: {
  item: InventoryItem;
  onApprove: () => void;
  onSupplier: () => void;
  onClose: () => void;
}) {
  return (
    <tr>
      <td colSpan={9} className="px-4 pb-4 bg-orange-50/50">
        <div className="border border-orange-200 rounded-xl p-5 bg-white shadow-sm mt-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                <span className="text-purple-700 font-bold text-xs">AI</span>
              </div>
              <h3 className="font-bold text-foreground">AI Recommendation</h3>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-orange-400 rounded-xl p-4 bg-orange-50 relative">
              <div className="absolute -top-3 left-4 bg-orange-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                BEST OPTION
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-orange-200 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">Transfer Stock</p>
                  <p className="text-xs text-muted-foreground">From Jakarta Hub</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-bold text-orange-600">500 units</p>
                  <p className="text-xs text-green-600">Save Rp 1,500,000</p>
                </div>
              </div>
              <p className="text-xs text-foreground">
                Sufficient overstock in Jakarta Hub. Transit 2 days, matches demand spike.
              </p>
            </div>

            <div className="border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-sm">
                  📦
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">Order from Supplier</p>
                  <p className="text-xs text-muted-foreground">Indostationery Ltd.</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-bold text-foreground">Rp 1,000,000</p>
                  <p className="text-xs text-muted-foreground">incl. 7,000/unit</p>
                </div>
              </div>
              <p className="text-xs text-foreground">
                Lead time 4 days. Stockout risk before delivery. Uses additional capital.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={onSupplier}>Order from Supplier</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={onApprove}>
              ✓ Approve Transfer
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function InventoryManagement() {
  const [openSolution, setOpenSolution] = useState<string | null>(null);
  const [warehouse,    setWarehouse]    = useState("All Warehouses");
  const [category,     setCategory]     = useState("All Categories");
  const [status,       setStatus]       = useState("All Statuses");
  const [searchQuery,  setSearchQuery]  = useState("");

  const handleApprove = (item: InventoryItem) => {
    setOpenSolution(null);
    toast.success("Transfer approved!", {
      description: `500 units of ${item.name} are being routed from Jakarta Hub.`,
    });
  };

  const handleSupplier = (item: InventoryItem) => {
    toast.info("Order placed with supplier", {
      description: `Purchase order for ${item.name} sent to Indostationery Ltd.`,
    });
  };

  const filtered = inventoryData.filter((item) => {
    if (warehouse !== "All Warehouses" && item.warehouse !== warehouse.toLowerCase()) return false;
    if (category  !== "All Categories"  && item.category  !== category.toLowerCase())  return false;
    if (status    !== "All Statuses"    && item.status    !== status)                  return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()))   return false;
    return true;
  });

  return (
    <Layout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-sm text-white mt-1">
            Manage inventory levels, respond to alerts, and execute transfers.
          </p>
        </div>

        {/* ── Filter Section ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
          <h2 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
            Filter Products
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <FilterSelect options={warehouses} value={warehouse} onChange={setWarehouse} />
            <FilterSelect options={categories} value={category}  onChange={setCategory}  />
            <FilterSelect options={statuses}   value={status}    onChange={setStatus}    />
            <div className="ml-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search Product Name..."
                className="pl-10 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Product Catalog ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Product Catalog
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-5 font-semibold text-foreground whitespace-nowrap">Product Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Current Stock</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Predicted Demand (4 days)</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Weight</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Expiry Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Recommended Action</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground whitespace-nowrap">Solution</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <>
                    <tr
                      key={item.id}
                      className={cn(
                        "border-b border-border hover:bg-muted/40 transition-colors",
                        openSolution === item.id && "bg-orange-50"
                      )}
                    >
                      <td className="py-4 px-5 font-semibold text-foreground">{item.name}</td>
                      <td className="py-4 px-4 font-bold text-foreground">{item.currentStock}</td>
                      <td className="py-4 px-4">
                        <p className={cn("font-medium", item.shortage ? "text-red-600" : "text-foreground")}>
                          {item.predictedDemand}
                        </p>
                        {item.shortage && (
                          <p className="text-xs text-red-500">↓{item.shortage} short</p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-foreground whitespace-nowrap">{item.harga}</td>
                      <td className="py-4 px-4 text-foreground whitespace-nowrap">{item.berat}</td>
                      <td className="py-4 px-4 text-foreground whitespace-nowrap">{item.expiryDate}</td>
                      <td className="py-4 px-4">
                        <span className={cn("inline-block px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap", statusColor(item.status))}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-foreground">{item.recommendedAction}</td>
                      <td className="py-4 px-4 text-center">
                        <Button
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8 px-4 min-w-[120px]"
                          onClick={() => setOpenSolution(openSolution === item.id ? null : item.id)}
                        >
                          {openSolution === item.id ? "Close Solution" : "View Solution"}
                        </Button>
                      </td>
                    </tr>

                    {openSolution === item.id && (
                      <AIRecommendationPanel
                        key={`ai-${item.id}`}
                        item={item}
                        onApprove={() => handleApprove(item)}
                        onSupplier={() => handleSupplier(item)}
                        onClose={() => setOpenSolution(null)}
                      />
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {inventoryData.length} items
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
