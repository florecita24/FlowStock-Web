import { Search, ChevronDown, ChevronLeft, ChevronRight, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Inventory, ListResponse } from "@shared/api";

type SolutionOption = {
  title: string;
  description: string;
  costImpact: string;
  riskLevel: "Low" | "Medium" | "High";
  feasibility: "Low" | "Medium" | "High";
  cost_breakdown?: Record<string, unknown> | null;
};

type RecommendationExplanation = {
  recommended_action: "None" | "Transfer" | "Discount" | "Order";
  best_option: SolutionOption;
  alternative_option: SolutionOption;
};

const FLOWSTOCK_AI_2_BASE_URL =
  import.meta.env.VITE_FLOWSTOCK_AI_2_BASE_URL?.trim() ||
  "https://fhatikaadr-flowstock-ai-2.hf.space";

interface InventoryItem {
  id: string;
  name: string;
  warehouse: string;
  category: string;
  currentStock: number;
  predictedDemand: number;
  shortage?: number;
  expiryDate: string;
  status: "Healthy" | "Critical" | "Overstock" | "Almost Expired";
  recommendedAction: string;
  harga: string;
  berat: string;
  productPrice: number;
  productWeightGrams: number;
}

function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString("id-ID")}`;
}

function formatWeight(weight: number): string {
  if (weight >= 1000) return `${(weight / 1000).toFixed(1)}kg`;
  return `${weight}g`;
}

function formatMoney(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function estimateFallbackCosts(item: InventoryItem) {
  const quantity = Math.max(item.shortage ?? 0, item.predictedDemand, 1);
  const productPrice = Math.max(item.productPrice, 0);
  const productWeightKg = Math.max(item.productWeightGrams, 0) / 1000;

  // Fallback distance assumptions (km)
  const defaultSupplierDistanceKm = 800; // typical long-haul supplier
  const defaultTransferDistanceKm = 50; // typical inter-hub transfer

  const baseRate = 3200; // base rate used previously (Rp per kg * scaled by distance/100)

  const orderItemCost = productPrice * quantity;
  const orderShippingCost = Math.max(15000, productWeightKg * quantity * baseRate * (defaultSupplierDistanceKm / 100));
  const orderOtherCosts = Math.max(5000, orderItemCost * 0.015);
  const estimatedOrderTotal = orderItemCost + orderShippingCost + orderOtherCosts;

  const transferShippingCost = Math.max(8000, productWeightKg * quantity * baseRate * (defaultTransferDistanceKm / 100) * 0.6);
  const transferOtherCosts = Math.max(5000, productPrice * quantity * 0.01);
  const estimatedTransferTotal = transferShippingCost + transferOtherCosts;

  const discountQty = Math.max(item.currentStock - (item.predictedDemand + (item.shortage ?? 0)), 1);
  const estimatedDiscountTotal = productPrice * discountQty * 0.15 + Math.max(5000, discountQty * 2500);
  const estimatedMonitorTotal = Math.max(2500, productPrice * 0.002);

  return {
    quantity,
    estimatedOrderTotal,
    estimatedTransferTotal,
    estimatedDiscountTotal,
    estimatedMonitorTotal,
    orderShippingCost,
    transferShippingCost,
    defaultSupplierDistanceKm,
    defaultTransferDistanceKm,
  };
}

function extractCostTotal(option: SolutionOption | undefined, fallback: number): number {
  const value = option?.cost_breakdown?.total_cost;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function computeOptionCosts(item: InventoryItem, option: SolutionOption | undefined, quantity: number) {
  const weightKg = Math.max(item.productWeightGrams, 0) / 1000;
  const unitPrice = Math.max(item.productPrice, 0);

  // Try to read explicit breakdown from AI if provided
  const cb = option?.cost_breakdown as Record<string, any> | undefined;
  const itemCost = typeof cb?.item_cost === "number" && Number.isFinite(cb.item_cost) && cb.item_cost > 0
    ? cb.item_cost
    : unitPrice * quantity;

  const supplierDistanceKm = typeof cb?.supplier_distance_km === "number" ? cb.supplier_distance_km : (cb?.distance_km as number | undefined);
  const transferDistanceKm = typeof cb?.transfer_distance_km === "number" ? cb.transfer_distance_km : (cb?.distance_km as number | undefined);

  const defaultSupplierDistanceKm = 800;
  const defaultTransferDistanceKm = 50;
  const baseRate = 3200;

  const distSupplier = Number.isFinite(supplierDistanceKm as number) ? supplierDistanceKm as number : defaultSupplierDistanceKm;
  const distTransfer = Number.isFinite(transferDistanceKm as number) ? transferDistanceKm as number : defaultTransferDistanceKm;

  const shippingFromSupplier = typeof cb?.shipping_cost === "number" && Number.isFinite(cb.shipping_cost)
    ? cb.shipping_cost
    : Math.max(15000, weightKg * quantity * baseRate * (distSupplier / 100));

  // If AI returned a list of donors, allocate required quantity across them
  let shippingTransfer = 0;
  let donorsUsed: Array<{ warehouse: string; qty: number; distance_km: number; shipping: number }> = [];

  if (Array.isArray(cb?.donors) && cb!.donors.length > 0) {
    // donors should be [{warehouse, qty, available_qty, distance_km, shipping_cost}]
    let remaining = quantity;
    const donors = (cb!.donors as any[]).slice().sort((a, b) => {
      const aDistance = Number(a.distance_km) || 0;
      const bDistance = Number(b.distance_km) || 0;
      if (aDistance !== bDistance) return aDistance - bDistance;
      return (Number(b.available_qty) || 0) - (Number(a.available_qty) || 0);
    });
    for (const d of donors) {
      if (remaining <= 0) break;
      const avail = Math.max(0, Number(d.available_qty ?? d.qty) || 0);
      if (avail <= 0) continue;
      const take = Math.min(avail, remaining);
      const dist = Number(d.distance_km) || Number(d.distance) || distTransfer;
      const ship = Number.isFinite(Number(d.shipping_cost))
        ? Number(d.shipping_cost)
        : Number.isFinite(Number(d.shipping))
          ? Number(d.shipping)
          : Math.max(8000, weightKg * take * baseRate * (dist / 100) * 0.6);
      donorsUsed.push({ warehouse: d.warehouse ?? d.name ?? "donor", qty: take, distance_km: dist, shipping: ship });
      shippingTransfer += ship;
      remaining -= take;
    }
    // If still remaining, assume remainder comes from a default donor at distTransfer
    if (remaining > 0) {
      const ship = Math.max(8000, weightKg * remaining * baseRate * (distTransfer / 100) * 0.6);
      donorsUsed.push({ warehouse: cb?.transfer_from ?? "nearby hub", qty: remaining, distance_km: distTransfer, shipping: ship });
      shippingTransfer += ship;
    }
  } else {
    shippingTransfer = typeof cb?.transfer_shipping_cost === "number" && Number.isFinite(cb.transfer_shipping_cost)
      ? cb.transfer_shipping_cost
      : Math.max(8000, weightKg * quantity * baseRate * (distTransfer / 100) * 0.6);
    donorsUsed = [{ warehouse: cb?.transfer_from ?? cb?.donor_warehouse ?? "Nearby hub", qty: quantity, distance_km: distTransfer, shipping: shippingTransfer }];
  }

  const otherCosts = typeof cb?.other_costs === "number" && Number.isFinite(cb.other_costs)
    ? cb.other_costs
    : Math.max(5000, itemCost * 0.01);

  const totalOrder = itemCost + shippingFromSupplier + otherCosts;
  const totalTransfer = shippingTransfer + otherCosts;

  return {
    itemCost,
    shippingFromSupplier,
    shippingTransfer,
    otherCosts,
    totalOrder,
    totalTransfer,
    distSupplier,
    distTransfer,
    donorsUsed,
    transferFrom: cb?.transfer_from ?? cb?.donor_warehouse ?? null,
  };
}

function buildInsightNarrative(item: InventoryItem, solution: RecommendationExplanation | null) {
  const fallback = estimateFallbackCosts(item);
  const qty = fallback.quantity;
  
  const bestCb = solution?.best_option?.cost_breakdown as any;
  const altCb = solution?.alternative_option?.cost_breakdown as any;

  // If AI didn't provide detailed item_cost, derive costs using local fallback formula
  // Determine appropriate quantities per option: for supplier orders, use shortage if provided
  const bestIsOrder = (solution?.recommended_action === "Order") || (solution?.best_option?.title?.toLowerCase().includes("order"));
  const bestIsTransfer = (solution?.recommended_action === "Transfer") || (solution?.best_option?.title?.toLowerCase().includes("transfer"));
  const altIsOrder = (solution?.alternative_option && (solution?.alternative_option.title?.toLowerCase().includes("order")));
  const altIsTransfer = (solution?.alternative_option && (solution?.alternative_option.title?.toLowerCase().includes("transfer"))) || solution?.recommended_action === "Transfer";

  const bestQty = bestIsOrder ? (item.shortage ?? qty) : qty;
  const altQty = altIsOrder ? (item.shortage ?? qty) : qty;

  const derivedBest = computeOptionCosts(item, solution?.best_option, bestQty);
  const derivedAlt = computeOptionCosts(item, solution?.alternative_option, altQty);

  const bestTotal = bestIsTransfer ? derivedBest.totalTransfer : derivedBest.totalOrder;
  const altTotal = altIsTransfer ? derivedAlt.totalTransfer : derivedAlt.totalOrder;
  const savings = Math.max(altTotal - bestTotal, 0);

  const bestTitle = solution?.best_option?.title ?? "Recommendation Option";
  const bestDesc = solution?.best_option?.description ?? "Operational optimization pathway.";
  const bestBody = (solution?.best_option as any)?.body ?? "Processing best optimal logistics configuration parameters.";

  const altTitle = solution?.alternative_option?.title ?? "Alternative Option";
  const altDesc = solution?.alternative_option?.description ?? "Backup fulfillment plan.";
  const altBody = (solution?.alternative_option as any)?.body ?? "Processing backup target metrics configurations.";

  return {
    bestTitle,
    bestDesc,
    bestBody,
    altTitle,
    altDesc,
    altBody,
    quantity: qty,
    bestTotal,
    altTotal,
    savings,
    // expose cost breakdowns: prefer AI-provided, fallback to derived values
    bestCb: {
      item_cost: bestIsTransfer ? 0 : (bestCb?.item_cost ?? derivedBest.itemCost),
      shipping_cost: bestIsTransfer ? derivedBest.shippingTransfer : (bestCb?.shipping_cost ?? derivedBest.shippingFromSupplier),
      markdown_cost: bestCb?.markdown_cost ?? 0,
      other_costs: bestCb?.other_costs ?? derivedBest.otherCosts,
      total_cost: bestTotal,
    },
    altCb: {
      item_cost: altIsTransfer ? 0 : (altCb?.item_cost ?? derivedAlt.itemCost),
      shipping_cost: altIsTransfer ? derivedAlt.shippingTransfer : (altCb?.shipping_cost ?? derivedAlt.shippingFromSupplier),
      markdown_cost: altCb?.markdown_cost ?? 0,
      other_costs: altCb?.other_costs ?? derivedAlt.otherCosts,
      total_cost: altTotal,
    },
    // donors used for transfer options (derived)
    bestDonors: derivedBest.donorsUsed ?? [],
    altDonors: derivedAlt.donorsUsed ?? [],
    bestTransferFrom: derivedBest.transferFrom,
    altTransferFrom: derivedAlt.transferFrom,
    fallback,
  };
}

function formatExpiryDate(date: string | null): string {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeStatus(status: string): "Healthy" | "Critical" | "Overstock" | "Almost Expired" {
  const lower = status.toLowerCase();
  if (lower.includes("critical")) return "Critical";
  if (lower.includes("overstock")) return "Overstock";
  if (lower.includes("almost expired")) return "Almost Expired";
  return "Healthy";
}

function mapInventoryRow(row: Inventory): InventoryItem {
  const productPrice = toNumber(row.products?.price, 0);
  const productWeightGrams = toNumber(row.products?.weight, 0);

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
    harga: row.products ? formatPrice(productPrice) : "-",
    berat: row.products ? formatWeight(productWeightGrams) : "-",
    productPrice,
    productWeightGrams,
  };
}

const statuses = ["All Statuses", "Critical", "Healthy", "Overstock", "Almost Expired"];

type ActionKind = "transfer" | "order" | "discount" | "monitor";

function detectActionKind(action: string): ActionKind {
  const a = (action || "").toLowerCase();
  if (a.includes("transfer")) return "transfer";
  if (a.includes("order")) return "order";
  if (a.includes("discount")) return "discount";
  return "monitor";
}

interface ActionButtonConfig {
  bestLabel: string;
  altLabel: string;
  bestToast: { title: string; description: (item: InventoryItem) => string };
  altToast: { title: string; description: (item: InventoryItem) => string };
}

function getActionConfig(action: string): ActionButtonConfig {
  const kind = detectActionKind(action);

  const CONFIGS: Record<ActionKind, ActionButtonConfig> = {
    transfer: {
      bestLabel: "✓ Approve Transfer",
      altLabel: "Order from Supplier",
      bestToast: {
        title: "Stock transfer initiated",
        description: (item) =>
          `${item.shortage ?? 0} units of ${item.name} are being routed to ${item.warehouse}.`,
      },
      altToast: {
        title: "Supplier order placed",
        description: (item) =>
          `Purchase order for ${item.shortage ?? 0} units of ${item.name} sent to supplier.`,
      },
    },
    order: {
      bestLabel: "✓ Place Supplier Order",
      altLabel: "Request Internal Transfer",
      bestToast: {
        title: "Supplier order placed",
        description: (item) =>
          `Purchase order for ${item.shortage ?? 0} units of ${item.name} sent to supplier.`,
      },
      altToast: {
        title: "Transfer requested",
        description: (item) =>
          `Stock transfer of ${item.name} requested from nearest hub.`,
      },
    },
    discount: {
      bestLabel: "✓ Launch Discount Campaign",
      altLabel: "Hold & Monitor",
      bestToast: {
        title: "Discount campaign launched",
        description: (item) =>
          `Promotional discount applied to ${item.name} in ${item.warehouse}.`,
      },
      altToast: {
        title: "Hold position",
        description: (item) =>
          `${item.name} will be re-evaluated in the next demand cycle.`,
      },
    },
    monitor: {
      bestLabel: "✓ Continue Monitoring",
      altLabel: "Flag for Manual Review",
      bestToast: {
        title: "Monitoring continued",
        description: (item) =>
          `${item.name} remains under automated watch.`,
      },
      altToast: {
        title: "Flagged for review",
        description: (item) =>
          `${item.name} sent to the operations team for manual inspection.`,
      },
    },
  };

  return CONFIGS[kind];
}

function statusColor(s: string) {
  if (s === "Critical")  return "bg-red-100 text-red-700";
  if (s === "Almost Expired") return "bg-yellow-100 text-yellow-800";
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

function AIRecommendationPanel({ item, solution, loading, error, onApprove, onSupplier, onClose }: {
  item: InventoryItem;
  solution: RecommendationExplanation | null;
  loading: boolean;
  error: string | null;
  onApprove: () => void;
  onSupplier: () => void;
  onClose: () => void;
}) {
  const bestOption = solution?.best_option;
  const alternativeOption = solution?.alternative_option;
  const insight = buildInsightNarrative(item, solution);

  const action = solution?.recommended_action ?? item.recommendedAction;

  // Resolusi data dinamis berdasarkan porsi penempatan box solusi masing-masing
  const isBestOptionTransfer = bestOption?.title.toLowerCase().includes("transfer");

  // Definisikan nama variabel yang dicari oleh JSX UI di bawah
  const bestItemCost = insight.bestCb?.item_cost ?? 0;
  const bestShipping = insight.bestCb?.shipping_cost ?? 0;
  const bestOther = insight.bestCb?.other_costs ?? 0;
  const bestTotal = insight.bestCb?.total_cost ?? insight.bestTotal;

  const altItemCost = insight.altCb?.item_cost ?? 0;
  const altShipping = insight.altCb?.shipping_cost ?? 0;
  const altOther = insight.altCb?.other_costs ?? 0;
  const altTotal = insight.altCb?.total_cost ?? insight.altTotal
  const isAltOptionTransfer = (alternativeOption?.title ?? "").toLowerCase().includes("transfer") || (solution?.recommended_action === "Transfer");
  const isSupplierCompactView = solution?.recommended_action === "Transfer" && (alternativeOption?.title ?? "").toLowerCase().includes("order");
  const isHoldMonitorView = solution?.recommended_action === "Discount" && /hold|monitor/i.test(alternativeOption?.title ?? "");
  const isBestDiscountView = solution?.recommended_action === "Discount" || /discount/i.test(bestOption?.title ?? "");
  const bestMarkdownCost = isBestDiscountView
    ? (typeof insight.bestCb?.markdown_cost === "number"
      ? insight.bestCb.markdown_cost
      : Math.max(bestTotal - bestShipping - bestOther, 0))
    : 0;
  const supplierCompactQty = Math.max(item.shortage ?? insight.quantity, 1);
  const supplierCompactItemCost = item.productPrice > 0 ? item.productPrice * supplierCompactQty : altItemCost;
  const supplierCompactTotal = supplierCompactItemCost + altShipping + altOther;

  return (
    <tr>
      <td colSpan={10} className="px-4 pb-4 bg-orange-50/30">
        <div className="border border-orange-200/80 rounded-2xl p-6 bg-white shadow-sm mt-1">
          
          {/* Header Controls */}
          <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">AI</span>
              </div>
              <h3 className="font-bold text-gray-900 text-sm tracking-tight">AI Recommendation Engine</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="py-6 text-center text-sm text-gray-500 animate-pulse">
              Generating dynamically adjusted solution architecture models...
            </div>
          ) : error ? (
            <div className="py-2 text-sm text-red-600 font-medium">{error}</div>
          ) : (
            /* Main Cards Split Layout */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              
              {/* LEFT CARD: BEST OPTION CARD */}
              <div className="border-2 border-orange-400 rounded-xl p-5 bg-orange-50/30 relative flex flex-col justify-between">
                <div className="absolute -top-3 left-4 bg-orange-500 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
                  Best Option
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">{insight.bestTitle}</h4>
                    <p className="text-xs text-green-600 font-semibold mt-0.5">{insight.bestDesc}</p>
                  </div>
                  
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {insight.bestBody}
                  </p>

                  {/* Estimation Cost Table - Best Option */}
                  <div className="bg-white/90 border border-orange-200/60 rounded-lg p-3 text-xs space-y-1.5 shadow-sm">
                    <p className="font-bold text-gray-800 border-b border-gray-100 pb-1">Estimate breakdown</p>
                    {!isBestDiscountView && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Item valuation cost:</span>
                        <span className="font-medium text-gray-700">
                          {(() => {
                            const price = item.productPrice ?? 0;
                            const bestIsOrderLocal = (solution?.recommended_action === "Order") || ((bestOption?.title ?? "").toLowerCase().includes("order"));
                            const bestIsTransferLocal = (solution?.recommended_action === "Transfer") || ((bestOption?.title ?? "").toLowerCase().includes("transfer"));
                            const qtyForBest = bestIsOrderLocal ? (item.shortage ?? insight.quantity) : insight.quantity;
                            if (bestIsTransferLocal) return formatMoney(0);
                            if (bestIsOrderLocal && price > 0 && qtyForBest > 0) {
                              return `${qtyForBest} × ${formatPrice(price)} = ${formatMoney(price * qtyForBest)}`;
                            }
                            if (bestItemCost > 0) return formatMoney(bestItemCost);
                            return price > 0 ? `${formatMoney(price * qtyForBest)}` : "Price missing";
                          })()}
                        </span>
                      </div>
                    )}
                    {isBestDiscountView && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Markdown cost:</span>
                        <span className="font-medium text-gray-700">{formatMoney(bestMarkdownCost)}</span>
                      </div>
                    )}
                    {/* If transfer, show donors list */}
                    {((solution?.recommended_action === "Transfer") || ((bestOption?.title ?? "").toLowerCase().includes("transfer"))) && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p className="font-semibold text-sm">Donor hubs:</p>
                        {insight.bestDonors && insight.bestDonors.length > 0 ? (
                          insight.bestDonors.map((d: any, i: number) => (
                            <p key={i}>{d.warehouse} — {d.qty} units — {Math.round(d.distance_km)} km — {formatMoney(d.shipping)}</p>
                          ))
                        ) : (
                          <p>{insight.bestTransferFrom ?? "Nearby hub"}</p>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">{isBestOptionTransfer ? "Transfer shipping:" : "Supplier shipping:"}</span>
                      <span className="font-medium text-gray-700">{formatMoney(bestShipping)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Handling / Other:</span>
                      <span className="font-medium text-gray-700">{formatMoney(bestOther)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-gray-200 pt-1.5 mt-1 font-bold text-sm">
                      <span className="text-gray-900">Total Operational Value:</span>
                      <span className="text-orange-600">{formatMoney(isBestDiscountView ? bestMarkdownCost + bestShipping + bestOther : bestTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-2 border-t border-orange-100/50">
                  <div>
                    <span className="text-[11px] font-medium text-gray-400 block uppercase tracking-wider">Risk</span>
                    <span className="text-xs font-bold text-green-600">{bestOption?.riskLevel ?? "Low"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-gray-400 block uppercase tracking-wider">Feasibility</span>
                    <span className="text-xs font-bold text-green-600">{bestOption?.feasibility ?? "High"}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT CARD: ALTERNATIVE CARD */}
              <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/40 flex flex-col justify-between">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">{insight.altTitle}</h4>
                    <p className="text-xs text-amber-600 font-semibold mt-0.5">
                      {isSupplierCompactView ? "Fulfill stock deficit via direct external supplier order." : insight.altDesc}
                    </p>
                  </div>
                  
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {isSupplierCompactView ? "Processing best optimal logistics configuration parameters." : insight.altBody}
                  </p>

                  {/* Estimation Cost Table - Alternative Option */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs space-y-1.5 shadow-sm">
                    <p className="font-bold text-gray-800 border-b border-gray-100 pb-1">Estimate breakdown</p>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Item valuation cost:</span>
                      <span className="font-medium text-gray-700">
                        {(() => {
                          if (isHoldMonitorView) return formatMoney(0);
                          if (isSupplierCompactView) {
                            return `${supplierCompactQty} × ${formatPrice(item.productPrice)} = ${formatMoney(supplierCompactItemCost)}`;
                          }
                          const price = item.productPrice ?? 0;
                          const altIsOrderLocal = ((solution?.alternative_option?.title ?? "").toLowerCase().includes("order"));
                          const altIsTransferLocal = ((solution?.alternative_option?.title ?? "").toLowerCase().includes("transfer")) || (solution?.recommended_action === "Transfer");
                          const qtyForAlt = altIsOrderLocal ? (item.shortage ?? insight.quantity) : insight.quantity;
                          if (altIsTransferLocal) return formatMoney(0);
                          if (altIsOrderLocal && price > 0 && qtyForAlt > 0) {
                            return `${qtyForAlt} × ${formatPrice(price)} = ${formatMoney(price * qtyForAlt)}`;
                          }
                          if (altItemCost > 0) return formatMoney(altItemCost);
                          return price > 0 ? `${formatMoney(price * qtyForAlt)}` : "Price missing";
                        })()}
                      </span>
                    </div>
                    {!isSupplierCompactView && (((solution?.alternative_option?.title ?? "").toLowerCase().includes("transfer")) || (solution?.recommended_action === "Transfer")) && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p className="font-semibold text-sm">Donor hubs:</p>
                        {insight.altDonors && insight.altDonors.length > 0 ? (
                          insight.altDonors.map((d: any, i: number) => (
                            <p key={i}>{d.warehouse} — {d.qty} units — {Math.round(d.distance_km)} km — {formatMoney(d.shipping)}</p>
                          ))
                        ) : (
                          <p>{insight.altTransferFrom ?? "Nearby hub"}</p>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">{isAltOptionTransfer ? "Transfer shipping:" : "Supplier shipping:"}</span>
                      <span className="font-medium text-gray-700">{formatMoney(isHoldMonitorView ? 0 : altShipping)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Handling / Other:</span>
                      <span className="font-medium text-gray-700">{formatMoney(isHoldMonitorView ? 0 : altOther)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-gray-200 pt-1.5 mt-1 font-bold text-sm">
                      <span className="text-gray-900">Total Operational Value:</span>
                      <span className="text-gray-900">{formatMoney(isHoldMonitorView ? 0 : (isSupplierCompactView ? supplierCompactTotal : altTotal))}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-2 border-t border-gray-100">
                  <div>
                    <span className="text-[11px] font-medium text-gray-400 block uppercase tracking-wider">Risk</span>
                    <span className="text-xs font-bold text-amber-600">{isHoldMonitorView ? "Low" : (isSupplierCompactView ? "Low" : (alternativeOption?.riskLevel ?? "Medium"))}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-gray-400 block uppercase tracking-wider">Feasibility</span>
                    <span className="text-xs font-bold text-amber-600">{isHoldMonitorView ? "High" : (isSupplierCompactView ? "High" : (alternativeOption?.feasibility ?? "Medium"))}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Action Footer */}
          {(() => {
            const config = getActionConfig(action);
            return (
              <div className="flex justify-end gap-2.5 mt-5 pt-4 border-t border-gray-100 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 border-gray-300 hover:bg-gray-50"
                  onClick={onSupplier}
                >
                  {config.altLabel}
                </Button>
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8 font-medium shadow-sm transition-colors"
                  onClick={onApprove}
                >
                  {config.bestLabel}
                </Button>
              </div>
            );
          })()}

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
  const [solutionData, setSolutionData] = useState<Record<string, RecommendationExplanation | null>>({});
  const [solutionLoading, setSolutionLoading] = useState<string | null>(null);
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const [warehouse,    setWarehouse]    = useState("All Warehouses");
  const [category,     setCategory]     = useState("All Categories");
  const [status,       setStatus]       = useState("All Statuses");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ListResponse<Inventory> = await res.json();
      setInventoryData(json.data.map(mapInventoryRow));
      setFetchError(null);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const waitForInventoryRefresh = async (timeoutMs = 180000, pollIntervalMs = 5000) => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      try {
        const res = await fetch(`/api/inventory?ts=${Date.now()}`);
        if (res.ok) {
          const json: ListResponse<Inventory> = await res.json();
          if (json.data.some((row) => Number(row.predicted_demand || 0) !== 0)) {
            return true;
          }
        }
      } catch (error) {
        console.warn("Polling inventory refresh failed:", error);
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return false;
  };

  useEffect(() => {
    let cancelled = false;
    fetchInventory().finally(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSyncInventory = async () => {
    try {
      setSyncing(true);
      const syncRes = await fetch("/api/inventory/sync", { method: "POST" });
      if (!syncRes.ok) throw new Error(`HTTP ${syncRes.status}`);

      toast.info("AI sync started", {
        description: "Waiting for Supabase inventory to refresh...",
      });

      const refreshed = await waitForInventoryRefresh();
      await fetchInventory();

      if (refreshed) {
        toast.success("Inventory refreshed", {
          description: "The web table now reflects the latest Supabase data.",
        });
      } else {
        toast.warning("Inventory refresh timed out", {
          description: "The AI sync started, but Supabase did not show updated predictions yet.",
        });
      }
    } catch (err) {
      console.error("Failed to sync inventory:", err);
      toast.error("Sync failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSyncing(false);
    }
  };

  const fetchSolution = async (item: InventoryItem) => {
    const cacheKey = item.id;
    if (solutionData[cacheKey]) return;

    try {
      setSolutionLoading(cacheKey);
      setSolutionError(null);

      const payload = {
        product_name: item.name,
        warehouse_name: item.warehouse,
        current_stock: item.currentStock,
        predicted_demand_14d: item.predictedDemand,
        target_stock: Math.max(item.currentStock + (item.shortage ?? 0), item.predictedDemand),
        shortage: item.shortage ?? 0,
        status: item.status,
        recommended_action: item.recommendedAction as "None" | "Transfer" | "Discount" | "Order",
      };

      const res = await fetch(`${FLOWSTOCK_AI_2_BASE_URL.replace(/\/$/, "")}/api/generate-recommendation-explanation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: RecommendationExplanation = await res.json();
      setSolutionData((current) => ({ ...current, [cacheKey]: data }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSolutionError(`Failed to load deployed AI-2 solution: ${message}`);
      toast.error("Failed to load View Solution", {
        description: message,
      });
    } finally {
      setSolutionLoading((current) => (current === cacheKey ? null : current));
    }
  };

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
    const action = solutionData[item.id]?.recommended_action ?? item.recommendedAction;
    const config = getActionConfig(action);
    toast.success(config.bestToast.title, {
      description: config.bestToast.description(item),
    });
  };

  const handleSupplier = (item: InventoryItem) => {
    setOpenSolution(null);
    const action = solutionData[item.id]?.recommended_action ?? item.recommendedAction;
    const config = getActionConfig(action);
    toast.info(config.altToast.title, {
      description: config.altToast.description(item),
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
  const ROWS_PER_PAGE = 15;
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
          <p className="text-sm text-foreground mt-1">
            View predicted demand with the alerts, and execute recommended solutions.
          </p>
          <div className="mt-4">
            <Button
              onClick={handleSyncInventory}
              disabled={loading || syncing}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {syncing ? "Syncing AI Data..." : "Sync AI Data & Refresh Table"}
            </Button>
          </div>
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
                  <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Warehouse</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Current Stock</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Predicted Demand (14 days)</th>
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
                    <td colSpan={10} className="py-8 text-center text-muted-foreground">
                      Loading inventory data...
                    </td>
                  </tr>
                )}
                {fetchError && !loading && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-red-600">
                      Failed to load: {fetchError}
                    </td>
                  </tr>
                )}
                {!loading && !fetchError && filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-muted-foreground">
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
                      <td className="py-4 px-4 text-foreground whitespace-nowrap capitalize">
                        {item.warehouse || "-"}
                      </td>
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
                        {item.recommendedAction && item.recommendedAction !== "None" ? (
                          <Button
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8 px-4 min-w-[120px]"
                            onClick={() => {
                              const nextOpen = openSolution === item.id ? null : item.id;
                              setOpenSolution(nextOpen);
                              if (nextOpen) {
                                void fetchSolution(item);
                              }
                            }}
                          >
                            {openSolution === item.id ? "Close Solution" : "View Solution"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>

                    {openSolution === item.id && (
                      <AIRecommendationPanel
                        key={`ai-${item.id}`}
                        item={item}
                        solution={solutionData[item.id] ?? null}
                        loading={solutionLoading === item.id}
                        error={solutionError}
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
