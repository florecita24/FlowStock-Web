import { Search, ChevronDown, ChevronLeft, ChevronRight, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Inventory, ListResponse } from "@shared/api";

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

function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString("id-ID")}`;
}

function formatWeight(weight: number): string {
  if (weight >= 1000) return `${(weight / 1000).toFixed(1)}kg`;
  return `${weight}g`;
}

function formatExpiryDate(date: string | null): string {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function normalizeStatus(status: string): "Healthy" | "Critical" | "Overstock" {
  const lower = status.toLowerCase();
  if (lower.includes("critical")) return "Critical";
  if (lower.includes("overstock")) return "Overstock";
  return "Healthy";
}

function mapInventoryRow(row: Inventory): InventoryItem {
  return {
    id: String(row.id),
    name: row.products?.name ?? `Product #${row.product_id}`,
    warehouse: (row.warehouses?.name ?? "").toLowerCase(),
    category: (row.products?.category ?? "").toLowerCase(),
    currentStock: row.current_stock,
    predictedDemand: row.predicted_demand,
    shortage: row.shortage > 0 ? row.shortage : undefined,
    expiryDate: formatExpiryDate(row.expiry_date),
    status: normalizeStatus(row.status),
    recommendedAction: row.recommended_action || "None",
    harga: row.products ? formatPrice(row.products.price) : "-",
    berat: row.products ? formatWeight(row.products.weight) : "-",
  };
}

const statuses = ["All Statuses", "Critical", "Healthy", "Overstock"];

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

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build a compact list of page numbers like: 1 … 4 5 [6] 7 8 … 20
  const pages: (number | "ellipsis")[] = [];
  const add = (p: number) => pages.push(p);
  const addEllipsis = () => {
    if (pages[pages.length - 1] !== "ellipsis") pages.push("ellipsis");
  };

  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 ||
      p === totalPages ||
      (p >= currentPage - 1 && p <= currentPage + 1)
    ) {
      add(p);
    } else {
      addEllipsis();
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={cn(
          "h-8 w-8 rounded-md flex items-center justify-center border border-border transition-colors",
          currentPage === 1
            ? "text-muted-foreground/50 cursor-not-allowed"
            : "text-foreground hover:bg-muted"
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`e-${i}`}
            className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              "h-8 min-w-8 px-2 rounded-md text-xs font-semibold border transition-colors",
              p === currentPage
                ? "bg-orange-500 text-white border-orange-500"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={cn(
          "h-8 w-8 rounded-md flex items-center justify-center border border-border transition-colors",
          currentPage === totalPages
            ? "text-muted-foreground/50 cursor-not-allowed"
            : "text-foreground hover:bg-muted"
        )}
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function InventoryManagement() {
  const [openSolution, setOpenSolution] = useState<string | null>(null);
  const [warehouse,    setWarehouse]    = useState("All Warehouses");
  const [category,     setCategory]     = useState("All Categories");
  const [status,       setStatus]       = useState("All Statuses");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchInventory() {
      try {
        setLoading(true);
        const res = await fetch("/api/inventory");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ListResponse<Inventory> = await res.json();
        if (cancelled) return;
        setInventoryData(json.data.map(mapInventoryRow));
        setFetchError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch inventory:", err);
        setFetchError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchInventory();
    return () => {
      cancelled = true;
    };
  }, []);

  const warehouseOptions = useMemo(() => {
    const set = new Set<string>();
    inventoryData.forEach((i) => i.warehouse && set.add(i.warehouse));
    return [
      "All Warehouses",
      ...Array.from(set).map((w) => w.charAt(0).toUpperCase() + w.slice(1)),
    ];
  }, [inventoryData]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    inventoryData.forEach((i) => i.category && set.add(i.category));
    return [
      "All Categories",
      ...Array.from(set).map((c) => c.charAt(0).toUpperCase() + c.slice(1)),
    ];
  }, [inventoryData]);

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

  // ── Pagination ──
  const ROWS_PER_PAGE = 25;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));

  // Reset to page 1 when filters change or data length changes
  useEffect(() => {
    setCurrentPage(1);
  }, [warehouse, category, status, searchQuery, inventoryData.length]);

  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * ROWS_PER_PAGE;
  const endIdx = startIdx + ROWS_PER_PAGE;
  const paginated = filtered.slice(startIdx, endIdx);

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
            <FilterSelect options={warehouseOptions} value={warehouse} onChange={setWarehouse} />
            <FilterSelect options={categoryOptions}  value={category}  onChange={setCategory}  />
            <FilterSelect options={statuses}         value={status}    onChange={setStatus}    />
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
                {loading && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      Loading inventory data...
                    </td>
                  </tr>
                )}
                {fetchError && !loading && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-red-600">
                      Failed to load: {fetchError}
                    </td>
                  </tr>
                )}
                {!loading && !fetchError && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      No inventory items found.
                    </td>
                  </tr>
                )}
                {!loading && !fetchError && paginated.map((item) => (
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
          <div className="px-6 py-3 border-t border-border flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : startIdx + 1}–
              {Math.min(endIdx, filtered.length)} of {filtered.length} items
              {filtered.length !== inventoryData.length && (
                <span className="ml-1">(filtered from {inventoryData.length})</span>
              )}
            </p>

            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
