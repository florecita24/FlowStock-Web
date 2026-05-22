import { RequestHandler } from "express";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { AIActionAlert, AIActionAlertsResponse } from "@shared/api";

const PROJECT_ROOT_CANDIDATES = [
  path.join(process.cwd(), "..", "..", "FlowStock-AI"),
  path.join(process.cwd(), "..", "FlowStock-AI"),
];

function resolveProjectRoot() {
  for (const candidate of PROJECT_ROOT_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return PROJECT_ROOT_CANDIDATES[0];
}

function readCsv(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return [] as any[];
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return parse(content, { columns: true, skip_empty_lines: true }) as any[];
}

function formatIDR(value: number | null | undefined) {
  const safeValue = value === null || value === undefined || Number.isNaN(value) ? 0 : value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(safeValue);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeLabelForIndex(index: number) {
  if (index === 0) return "2m ago";
  if (index === 1) return "1h ago";
  if (index === 2) return "3h ago";
  return `${index + 1}h ago`;
}

function normalizeAction(action: string) {
  if (action === "Restock Order") return "Order";
  if (action === "⚡ Transfer") return "Transfer";
  if (action === "Discount") return "Discount";
  return action || "None";
}

function priorityScore(row: any) {
  const statusWeight: Record<string, number> = { Critical: 120, Overstock: 75, Healthy: 20 };
  const actionWeight: Record<string, number> = { Order: 45, Transfer: 40, Discount: 25, None: 0 };
  const currentStock = Number(row.current_stock ?? 0);
  const targetStock = Math.max(Number(row.target_stock ?? 0), 1);
  const predictedDemand = Number(row.predicted_demand_14d ?? 0);
  const shortage = Number(row.shortage ?? 0);
  const costOrder = Number(row.cost_order_idr ?? 0);
  const costTransfer = Number(row.cost_transfer_idr ?? 0);
  const action = String(row.recommended_action ?? "None");
  const status = String(row.status ?? "Healthy");

  const shortageRatio = shortage / targetStock;
  const demandPressure = Math.max(predictedDemand - currentStock, 0) / Math.max(currentStock, 1);
  const costPressure = action === "Order"
    ? Math.min(costOrder / 1_000_000, 35)
    : Math.min(costTransfer / 1_000_000, 25);

  return (
    (statusWeight[status] ?? 0) +
    (actionWeight[action] ?? 0) +
    shortageRatio * 140 +
    demandPressure * 55 +
    costPressure
  );
}

function categoryFromRow(row: any) {
  const action = String(row.recommended_action ?? "None");
  const status = String(row.status ?? "Healthy");

  if (action === "Transfer") return "Transfer Opportunity";
  if (action === "Discount" || status === "Overstock") return "Overstock Alert";
  if (action === "Order" || status === "Critical") return "Impending Stockout";
  return null;
}

function buildLookupMaps() {
  const root = resolveProjectRoot();
  const products = readCsv(path.join(root, "dataset", "products.csv"));
  const warehouses = readCsv(path.join(root, "dataset", "warehouses.csv"));
  const inventory = readCsv(path.join(root, "dataset", "inventory.csv"));

  const productById = new Map<number, any>();
  const productByName = new Map<string, any>();
  const warehouseById = new Map<number, any>();
  const warehouseByName = new Map<string, any>();

  for (const row of products) {
    const product = {
      id: Number(row.id ?? 0),
      sku: String(row.sku ?? ""),
      name: String(row.name ?? ""),
      category: String(row.category ?? ""),
      price: Number(row.price ?? 0),
      weight: Number(row.weight ?? 0),
    };
    productById.set(product.id, product);
    productByName.set(product.name.toLowerCase(), product);
  }

  for (const row of warehouses) {
    const warehouse = {
      id: Number(row.id ?? 0),
      name: String(row.name ?? ""),
      latitude: Number(row.latitude ?? 0),
      longitude: Number(row.longitude ?? 0),
    };
    warehouseById.set(warehouse.id, warehouse);
    warehouseByName.set(warehouse.name.toLowerCase(), warehouse);
  }

  const inventoryByProduct = new Map<number, any[]>();
  for (const row of inventory) {
    const productId = Number(row.product_id ?? 0);
    const item = {
      product_id: productId,
      warehouse_id: Number(row.warehouse_id ?? 0),
      current_stock: Number(row.current_stock ?? 0),
      predicted_demand: Number(row.predicted_demand ?? 0),
      shortage: Number(row.shortage ?? 0),
      status: String(row.status ?? "Healthy"),
      recommended_action: normalizeAction(String(row.recommended_action ?? "None")),
    };
    if (!inventoryByProduct.has(productId)) {
      inventoryByProduct.set(productId, []);
    }
    inventoryByProduct.get(productId)!.push(item);
  }

  return { productById, productByName, warehouseById, warehouseByName, inventoryByProduct };
}

function findBestTransferSource(productId: number, destinationWarehouseId: number, maps: ReturnType<typeof buildLookupMaps>) {
  const rows = maps.inventoryByProduct.get(productId) ?? [];
  const destination = maps.warehouseById.get(destinationWarehouseId);
  if (!destination) return null;

  let best: any = null;
  let bestScore = -Infinity;

  for (const row of rows) {
    const surplus = row.current_stock - row.predicted_demand;
    if (surplus <= 0) continue;
    const source = maps.warehouseById.get(row.warehouse_id);
    if (!source) continue;
    const distance = haversineKm(source.latitude, source.longitude, destination.latitude, destination.longitude);
    const score = surplus * 1000 - distance;
    if (score > bestScore) {
      bestScore = score;
      best = { source, distance, surplus };
    }
  }

  return best;
}

function buildCostInputs(row: any, maps: ReturnType<typeof buildLookupMaps>) {
  const product = maps.productById.get(Number(row.product_id ?? 0)) ?? maps.productByName.get(String(row.product_name ?? "").toLowerCase());
  const warehouse = maps.warehouseById.get(Number(row.warehouse_id ?? 0)) ?? maps.warehouseByName.get(String(row.warehouse_name ?? "").toLowerCase());
  const quantity = Math.max(Number(row.shortage ?? 0), Number(row.predicted_demand_14d ?? 0), 1);

  const productPrice = Number(product?.price ?? 0);
  const productWeightKg = Number(product?.weight ?? 0) / 1000;
  const transferSource = product && warehouse ? findBestTransferSource(Number(product.id), Number(warehouse.id), maps) : null;
  const transferDistanceKm = transferSource?.distance ?? null;

  const orderItemCost = productPrice * quantity;
  const orderShippingCost = Math.max(15000, productWeightKg * quantity * 3200);
  const orderOtherCosts = Math.max(5000, orderItemCost * 0.015);
  const estimatedOrderTotal = orderItemCost + orderShippingCost + orderOtherCosts;

  const transferItemCost = 0;
  const transferShippingCost = Math.max(8000, (productWeightKg || 0) * quantity * 1800);
  const transferOtherCosts = Math.max(5000, productPrice * quantity * 0.01);
  const estimatedTransferTotal = transferItemCost + transferShippingCost + transferOtherCosts;

  const overstockQty = Math.max(Number(row.current_stock ?? 0) - Number(row.target_stock ?? 0), 0);
  const discountQty = Math.max(overstockQty, 1);
  const estimatedDiscountTotal = productPrice * discountQty * 0.15 + Math.max(5000, discountQty * 2500);

  return {
    product,
    warehouse,
    transferSource,
    transferDistanceKm,
    estimatedOrderTotal,
    estimatedTransferTotal,
    estimatedDiscountTotal,
  };
}

function buildAlert(row: any, index: number, maps: ReturnType<typeof buildLookupMaps>): AIActionAlert {
  const action = String(row.recommended_action ?? "None") as AIActionAlert["recommendedAction"];
  const status = String(row.status ?? "Healthy");
  const productName = String(row.product_name ?? "Unknown Product");
  const warehouseName = String(row.warehouse_name ?? "Unknown Warehouse");
  const sku = row.sku ? String(row.sku) : undefined;
  const currentStock = Number(row.current_stock ?? 0);
  const targetStock = Number(row.target_stock ?? 0);
  const shortage = Number(row.shortage ?? 0);

  const costInputs = buildCostInputs(row, maps);
  const costOrder = formatIDR(costInputs.estimatedOrderTotal);
  const costTransfer = formatIDR(costInputs.estimatedTransferTotal);
  const costDiscount = formatIDR(costInputs.estimatedDiscountTotal);

  if (action === "Transfer") {
    const severity = shortage > 0 || status === "Critical" ? "critical" : "warning";
    return {
      id: `alert-${row.id}`,
      severity,
      title: severity === "critical" ? "Impending Stockout" : "Transfer Opportunity",
      body: `${warehouseName} should receive ${shortage} units of ${productName} (SKU ${sku ?? "-"}) to avoid a stockout. Estimated transfer cost ${costTransfer} versus order cost ${costOrder}.`,
      timeLabel: timeLabelForIndex(index),
      productName,
      sku,
      warehouseName,
      currentStock,
      predictedDemand14d: Number(row.predicted_demand_14d ?? 0),
      targetStock,
      shortage,
      recommendedAction: action,
      ctaLabel: "Execute Transfer Now",
    };
  }

  if (action === "Order") {
    return {
      id: `alert-${row.id}`,
      severity: "critical",
      title: "Impending Stockout",
      body: `${warehouseName} is projected to be short ${shortage} units of ${productName} (SKU ${sku ?? "-"}) within 14 days. Estimated order cost ${costOrder}; transfer fallback ${costTransfer} if donor stock exists.`,
      timeLabel: timeLabelForIndex(index),
      productName,
      sku,
      warehouseName,
      currentStock,
      predictedDemand14d: Number(row.predicted_demand_14d ?? 0),
      targetStock,
      shortage,
      recommendedAction: action,
      ctaLabel: "Place Order Now",
    };
  }

  if (action === "Discount") {
    return {
      id: `alert-${row.id}`,
      severity: "warning",
      title: "Overstock Alert",
      body: `${warehouseName} is holding ${currentStock} units of ${productName} — above target ${targetStock}. Estimated markdown cost ${costDiscount} to move excess stock faster.`,
      timeLabel: timeLabelForIndex(index),
      productName,
      sku,
      warehouseName,
      currentStock,
      predictedDemand14d: Number(row.predicted_demand_14d ?? 0),
      targetStock,
      shortage,
      recommendedAction: action,
      ctaLabel: "Review Simulation",
    };
  }

  return {
    id: `alert-${row.id}`,
    severity: "success",
    title: "Stock Health Check",
    body: `${productName} at ${warehouseName} is aligned with target stock. Keep monitoring demand and replenishment costs.`,
    timeLabel: timeLabelForIndex(index),
    productName,
    sku,
    warehouseName,
    currentStock,
    predictedDemand14d: Number(row.predicted_demand_14d ?? 0),
    targetStock,
    shortage,
    recommendedAction: action,
    ctaLabel: "View Simulation",
  };
}

export const handleActionAlerts: RequestHandler = (req, res) => {
  try {
    const maps = buildLookupMaps();
    const root = resolveProjectRoot();
    const recommendationsPath = path.join(root, "artifacts", "inventory_ai_recommendations.csv");
    const records = readCsv(recommendationsPath);

    const rows = records.map((row) => ({
      ...row,
      id: Number(row.id ?? 0),
      product_id: Number(row.product_id ?? 0),
      warehouse_id: Number(row.warehouse_id ?? 0),
      current_stock: Number(row.current_stock ?? 0),
      predicted_demand_14d: Number(row.predicted_demand_14d ?? 0),
      target_stock: Number(row.target_stock ?? 0),
      shortage: Number(row.shortage ?? 0),
      status: String(row.status ?? "Healthy"),
      recommended_action: normalizeAction(String(row.recommended_action ?? "None")),
      alert_category: categoryFromRow(row),
      priority_score: priorityScore(row),
    }));

    const categories = ["Impending Stockout", "Transfer Opportunity", "Overstock Alert"] as const;
    const selected: any[] = [];
    const usedIds = new Set<number>();

    for (const category of categories) {
      const categoryRows = rows
        .filter((row) => row.alert_category === category)
        .sort((a, b) => b.priority_score - a.priority_score || b.shortage - a.shortage || b.predicted_demand_14d - a.predicted_demand_14d);

      const chosen = categoryRows.find((row) => !usedIds.has(row.id));
      if (chosen) {
        selected.push(chosen);
        usedIds.add(chosen.id);
      }
    }

    const alerts: AIActionAlert[] = selected.slice(0, 3).map((row, index) => buildAlert(row, index, maps));

    const response: AIActionAlertsResponse = {
      data: alerts,
      total: alerts.length,
    };

    res.json(response);
  } catch (error) {
    console.error("Error reading action alerts:", error);
    res.status(500).json({
      error: "Failed to read action alerts",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
