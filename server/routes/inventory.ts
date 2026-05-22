import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import { ListResponse, Inventory } from "@shared/api";

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
