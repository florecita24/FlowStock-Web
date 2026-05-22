import { Search, ChevronDown, TrendingUp, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fetchAiApi } from "@/lib/ai-api";
import {
  InventoryRecommendation,
  InventoryRecommendationsResponse,
  RecommendationExplanation,
} from "@shared/api";

function formatIDR(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getOptionTotalCost(option: RecommendationExplanation["best_option"]) {
  return option.cost_breakdown?.total_cost ?? null;
}

function renderCostSummary(
  option: RecommendationExplanation["best_option"],
  compareTotal?: number | null,
  emphasize = false
) {
  const total = getOptionTotalCost(option);
  const savings =
    total !== null && compareTotal !== undefined && compareTotal !== null
      ? Math.max(compareTotal - total, 0)
      : null;

  return (
    <div
      className={cn(
        "rounded-xl border p-3 mb-3",
        emphasize ? "bg-white/70 border-orange-200" : "bg-white border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Estimated Total Cost
          </p>
          <p className="text-lg font-bold text-foreground mt-0.5">
            {formatIDR(total)}
          </p>
        </div>
        {savings !== null && savings > 0 ? (
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Estimated Saving
            </p>
            <p className="text-sm font-bold text-green-600">
              {formatIDR(savings)}
            </p>
          </div>
        ) : null}
      </div>

      {option.cost_breakdown ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div className="rounded-lg bg-muted/40 px-2 py-1.5">
            Item: <span className="font-semibold text-foreground">{formatIDR(option.cost_breakdown.item_cost)}</span>
          </div>
          <div className="rounded-lg bg-muted/40 px-2 py-1.5">
            Shipping: <span className="font-semibold text-foreground">{formatIDR(option.cost_breakdown.shipping_cost)}</span>
          </div>
          <div className="rounded-lg bg-muted/40 px-2 py-1.5 col-span-2">
            Other: <span className="font-semibold text-foreground">{formatIDR(option.cost_breakdown.other_costs)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const warehouses = [
  "All Warehouses",
  "Jakarta Hub",
  "Bandung Hub",
  "Semarang Hub",
  "Surabaya Hub",
  "Denpasar Hub",
  "Makassar Hub",
  "Medan Hub",
  "Palembang Hub",
  "Yogyakarta Hub",
  "Balikpapan Hub",
];
const categories = [
  "All Categories",
  "Electronic",
  "Fashion",
  "Stationery",
  "Beauty",
  "Food",
];
const statuses = ["All Statuses", "Critical", "Healthy", "Overstock"];
const actions = [
  "All Actions",
  "None",
  "Transfer",
  "Discount",
  "Order",
];

function statusColor(s: string) {
  if (s === "Critical") return "bg-red-100 text-red-700";
  if (s === "Overstock") return "bg-orange-100 text-orange-700";
  return "bg-green-100 text-green-700";
}

function actionBadgeColor(a: string) {
  if (a === "Transfer") return "bg-blue-100 text-blue-700";
  if (a === "Order") return "bg-red-100 text-red-700";
  if (a === "Discount") return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-700";
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
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
    </div>
  );
}

function AIRecommendationPanel({
  item,
  onApprove,
  onSupplier,
  onClose,
}: {
  item: InventoryRecommendation;
  onApprove: () => void;
  onSupplier: () => void;
  onClose: () => void;
}) {
  const [explanation, setExplanation] =
    useState<RecommendationExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch explanation from Gemini on mount
  useEffect(() => {
    const fetchExplanation = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchAiApi(
          "/api/generate-recommendation-explanation",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              product_name: item.product_name,
              warehouse_name: item.warehouse_name,
              current_stock: item.current_stock,
              predicted_demand_14d: item.predicted_demand_14d,
              target_stock: item.target_stock,
              shortage: item.shortage,
              status: item.status,
              recommended_action: item.recommended_action,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch recommendation");
        }

        const data: RecommendationExplanation = await response.json();
        setExplanation(data);
      } catch (err) {
        console.error("Error fetching recommendation:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch recommendation"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchExplanation();
  }, [item]);

  return (
    <tr>
      <td colSpan={10} className="px-4 pb-4 bg-orange-50/50">
        <div className="border border-orange-200 rounded-xl p-5 bg-white shadow-sm mt-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                <span className="text-purple-700 font-bold text-xs">AI</span>
              </div>
              <h3 className="font-bold text-foreground">
                AI Recommendation - {item.product_name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              <span className="ml-2 text-sm text-muted-foreground">
                Analyzing with AI...
              </span>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-700 text-sm">{error}</p>
                <p className="text-xs text-red-600 mt-1">
                  Using default recommendation logic.
                </p>
              </div>
            </div>
          ) : explanation ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Best Option */}
              <div className="border-2 border-orange-400 rounded-xl p-4 bg-orange-50 relative">
                <div className="absolute -top-3 left-4 bg-orange-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                  BEST OPTION
                </div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-sm">
                      {explanation.best_option.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {explanation.best_option.costImpact}
                    </p>
                  </div>
                </div>
                {renderCostSummary(
                  explanation.best_option,
                  getOptionTotalCost(explanation.alternative_option),
                  true
                )}
                <p className="text-xs text-foreground mb-3">
                  {explanation.best_option.description}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">Risk:</p>
                    <p
                      className={cn(
                        "font-medium",
                        explanation.best_option.riskLevel === "Low"
                          ? "text-green-600"
                          : explanation.best_option.riskLevel === "Medium"
                            ? "text-yellow-600"
                            : "text-red-600"
                      )}
                    >
                      {explanation.best_option.riskLevel}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Feasibility:</p>
                    <p
                      className={cn(
                        "font-medium",
                        explanation.best_option.feasibility === "High"
                          ? "text-green-600"
                          : explanation.best_option.feasibility === "Medium"
                            ? "text-yellow-600"
                            : "text-red-600"
                      )}
                    >
                      {explanation.best_option.feasibility}
                    </p>
                  </div>
                </div>
              </div>

              {/* Alternative Option */}
              <div className="border border-border rounded-xl p-4 bg-muted/30">
                <div className="absolute -top-3 left-4 bg-gray-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full invisible">
                  ALTERNATIVE
                </div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 text-gray-600">
                    <span className="text-sm">📋</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-sm">
                      {explanation.alternative_option.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {explanation.alternative_option.costImpact}
                    </p>
                  </div>
                </div>
                {renderCostSummary(explanation.alternative_option)}
                <p className="text-xs text-foreground mb-3">
                  {explanation.alternative_option.description}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">Risk:</p>
                    <p
                      className={cn(
                        "font-medium",
                        explanation.alternative_option.riskLevel === "Low"
                          ? "text-green-600"
                          : explanation.alternative_option.riskLevel ===
                              "Medium"
                            ? "text-yellow-600"
                            : "text-red-600"
                      )}
                    >
                      {explanation.alternative_option.riskLevel}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Feasibility:</p>
                    <p
                      className={cn(
                        "font-medium",
                        explanation.alternative_option.feasibility === "High"
                          ? "text-green-600"
                          : explanation.alternative_option.feasibility ===
                              "Medium"
                            ? "text-yellow-600"
                            : "text-red-600"
                      )}
                    >
                      {explanation.alternative_option.feasibility}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={onApprove}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "✓ Approve Best Option"
              )}
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function InventoryManagement() {
  const [data, setData] = useState<InventoryRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSolution, setOpenSolution] = useState<number | null>(null);
  const [warehouse, setWarehouse] = useState("All Warehouses");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Statuses");
  const [action, setAction] = useState("All Actions");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();

        if (warehouse !== "All Warehouses") {
          params.append("warehouse", warehouse);
        }
        if (category !== "All Categories") {
          params.append("category", category);
        }
        if (status !== "All Statuses") {
          params.append("status", status);
        }
        if (action !== "All Actions") {
          params.append("action", action);
        }

        const response = await fetchAiApi(
          `/api/inventory-recommendations?${params.toString()}`,
          undefined,
          `/api/inventory-recommendations?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch recommendations");
        }

        const result: InventoryRecommendationsResponse =
          await response.json();
        setData(result.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An error occurred"
        );
        console.error("Error fetching inventory recommendations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [warehouse, category, status, action]);

  const handleApprove = (item: InventoryRecommendation) => {
    setOpenSolution(null);
    toast.success("Action approved!", {
      description: `Recommendation for ${item.product_name} at ${item.warehouse_name} has been approved.`,
    });
  };

  const handleSupplier = (item: InventoryRecommendation) => {
    toast.info("Action triggered", {
      description: `Action for ${item.product_name} sent to operations team.`,
    });
  };

  const filtered = data.filter((item) => {
    if (
      searchQuery &&
      !item.product_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <Layout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Inventory Management
          </h1>
          <p className="text-sm text-white mt-1">
            AI-powered inventory recommendations based on demand forecasts.
          </p>
        </div>

        {/* ── Filter Section ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
          <h2 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
            Filter Products
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <FilterSelect
              options={warehouses}
              value={warehouse}
              onChange={setWarehouse}
            />
            <FilterSelect
              options={categories}
              value={category}
              onChange={setCategory}
            />
            <FilterSelect
              options={statuses}
              value={status}
              onChange={setStatus}
            />
            <FilterSelect
              options={actions}
              value={action}
              onChange={setAction}
            />
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
            {loading ? (
              <div className="px-6 py-8 text-center text-muted-foreground">
                Loading recommendations...
              </div>
            ) : error ? (
              <div className="px-6 py-8 text-center">
                <p className="text-red-600 font-semibold">{error}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Make sure the AI model has been trained and recommendations
                  CSV exists.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-5 font-semibold text-foreground whitespace-nowrap">
                      Product
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                      Warehouse
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                      Current Stock
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                      Predicted Demand (14d)
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                      Target Stock
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                      Category
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                      Recommended Action
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                      Solution
                    </th>
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
                        <td className="py-4 px-5 font-semibold text-foreground">
                          {item.product_name}
                        </td>
                        <td className="py-4 px-4 text-foreground text-xs">
                          {item.warehouse_name}
                        </td>
                        <td className="py-4 px-4 font-bold text-foreground">
                          {item.current_stock}
                        </td>
                        <td className="py-4 px-4">
                          <p
                            className={cn(
                              "font-medium",
                              item.shortage > 0
                                ? "text-red-600"
                                : "text-foreground"
                            )}
                          >
                            {item.predicted_demand_14d}
                          </p>
                          {item.shortage > 0 && (
                            <p className="text-xs text-red-500">
                              ↓{item.shortage} short
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-foreground">
                          {item.target_stock}
                        </td>
                        <td className="py-4 px-4 text-foreground text-xs">
                          {item.product_category}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              "inline-block px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
                              statusColor(item.status)
                            )}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              "inline-block px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
                              actionBadgeColor(item.recommended_action)
                            )}
                          >
                            {item.recommended_action}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {item.recommended_action === "None" ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8 px-4 min-w-[120px]"
                              onClick={() =>
                                setOpenSolution(
                                  openSolution === item.id ? null : item.id
                                )
                              }
                            >
                              {openSolution === item.id
                                ? "Close"
                                : "View Details"}
                            </Button>
                          )}
                        </td>
                      </tr>

                      {openSolution === item.id &&
                        item.recommended_action !== "None" && (
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
            )}
          </div>
          {!loading && !error && (
            <div className="px-6 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Showing {filtered.length} of {data.length} items
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
