import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import { ListResponse, StoreSales } from "@shared/api";

export const getStoreSales: RequestHandler = async (req, res) => {
  try {
    const { data, error, count } = await supabase
      .from("store_sales")
      .select("*", { count: "exact" });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const response: ListResponse<StoreSales> = {
      data: data || [],
      count: count || 0,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching store sales:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getStoreSalesByWarehouse: RequestHandler = async (req, res) => {
  try {
    const { warehouseId } = req.params;

    const { data, error, count } = await supabase
      .from("store_sales")
      .select("*", { count: "exact" })
      .eq("warehouse", warehouseId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const response: ListResponse<StoreSales> = {
      data: data || [],
      count: count || 0,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching store sales by warehouse:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getStoreSalesByDateRange: RequestHandler = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "startDate and endDate query parameters are required"
      });
    }

    const { data, error, count } = await supabase
      .from("store_sales")
      .select("*", { count: "exact" })
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const response: ListResponse<StoreSales> = {
      data: data || [],
      count: count || 0,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching store sales by date range:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
