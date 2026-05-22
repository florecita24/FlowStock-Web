/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Inventory recommendation from AI model
 */
export interface InventoryRecommendation {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  product_category: string;
  warehouse_id: number;
  warehouse_name: string;
  current_stock: number;
  predicted_demand_14d: number;
  reorder_point: number;
  target_stock: number;
  shortage: number;
  status: "Healthy" | "Critical" | "Overstock";
  recommended_action: "None" | "Transfer" | "Discount" | "Order";
}

export interface InventoryRecommendationsResponse {
  data: InventoryRecommendation[];
  total: number;
}

export type AIActionSeverity = "critical" | "warning" | "success";

/**
 * AI Action Alert shown on the dashboard
 */
export interface AIActionAlert {
  id: string;
  severity: AIActionSeverity;
  title: string;
  body: string;
  timeLabel: string;
  productName?: string;
  sku?: string;
  warehouseName?: string;
  currentStock?: number;
  predictedDemand14d?: number;
  targetStock?: number;
  shortage?: number;
  recommendedAction?: "None" | "Transfer" | "Discount" | "Order";
  ctaLabel?: string;
}

export interface AIActionAlertsResponse {
  data: AIActionAlert[];
  total: number;
}

/**
 * Solution option for a recommendation explanation
 */
export interface SolutionOption {
  title: string;
  description: string;
  costImpact: string;
  riskLevel: "Low" | "Medium" | "High";
  feasibility: "Low" | "Medium" | "High";
  cost_breakdown?: {
    currency: string;
    item_cost: number;
    shipping_cost: number;
    other_costs: number;
    total_cost: number;
  };
}

/**
 * Gemini or fallback explanation result for the inventory recommendation panel
 */
export interface RecommendationExplanation {
  recommended_action: "None" | "Transfer" | "Discount" | "Order";
  best_option: SolutionOption;
  alternative_option: SolutionOption;
}
