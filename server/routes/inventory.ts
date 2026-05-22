import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import { ListResponse, Inventory } from "@shared/api";

const FLOWSTOCK_AI_BASE_URL =
  process.env.FLOWSTOCK_AI_BASE_URL?.trim() || "https://fhatikaadr-flowstock-ai-1.hf.space";

async function syncInventoryWithFlowStockAI() {
  const url = `${FLOWSTOCK_AI_BASE_URL.replace(/\/$/, "")}/api/sync-inventory`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(
        `FlowStock AI sync failed (${response.status}): ${body.slice(0, 240)}`
      );
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.warn("FlowStock AI sync timed out after 8s; continuing with cached inventory data.");
      return;
    }

    console.warn("FlowStock AI sync unavailable:", error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timeoutId);
  }
}

export const syncInventory: RequestHandler = async (_req, res) => {
  try {
    await syncInventoryWithFlowStockAI();
    return res.status(202).json({
      status: "accepted",
      message: "Inventory sync started.",
    });
  } catch (err) {
    console.error("Error starting inventory sync:", err);
    return res.status(500).json({ error: String(err) });
  }
};

export const getInventory: RequestHandler = async (req, res) => {
  try {
    const { data, error, count } = await supabase
      .from("inventory")
      .select(
        `
        *,
        products (*),
        warehouses (*)
        `,
        { count: "exact" }
      );

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({ error: error.message });
    }

    const response: ListResponse<Inventory> = {
      data: data || [],
      count: count || 0,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching inventory:", err);
    res.status(500).json({ error: String(err) });
  }
};

export const getInventoryByWarehouse: RequestHandler = async (req, res) => {
  try {
    const { warehouseId } = req.params;

    const { data, error, count } = await supabase
      .from("inventory")
      .select("*", { count: "exact" })
      .eq("warehouse_id", warehouseId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const response: ListResponse<Inventory> = {
      data: data || [],
      count: count || 0,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching inventory by warehouse:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getInventoryByProduct: RequestHandler = async (req, res) => {
  try {
    const { productId } = req.params;

    const { data, error, count } = await supabase
      .from("inventory")
      .select("*", { count: "exact" })
      .eq("product_id", productId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const response: ListResponse<Inventory> = {
      data: data || [],
      count: count || 0,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching inventory by product:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
