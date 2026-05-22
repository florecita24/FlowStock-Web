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

// "Current year" for the simulated app — dataset covers 2013-2018, treat 2018 as today
const CURRENT_YEAR = 2018;

export const getWeeklySalesByProduct: RequestHandler = async (req, res) => {
  try {
    const { productId } = req.params;
    const productIdNum = Number(productId);
    const year = Number(req.query.year) || CURRENT_YEAR;

    if (!productIdNum || isNaN(productIdNum)) {
      return res.status(400).json({ error: "Invalid productId" });
    }

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Fetch all sales for this product in the given year using pagination
    // (Supabase default limit is 1000 per request)
    const pageSize = 1000;
    let allRows: { date: string; sales: number }[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("store_sales")
        .select("date, sales")
        .eq("item", productIdNum)
        .gte("date", startDate)
        .lte("date", endDate)
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Supabase error:", error);
        return res.status(400).json({ error: error.message });
      }

      if (!data || data.length === 0) break;
      allRows = allRows.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    // Aggregate into both weekly buckets (for "All months" view) and daily buckets (for specific month)
    // weekly key = `${month}-${weekIdx}` (0-indexed)
    // daily key  = `${month}-${day}` (day is 1-31)
    const weeklyBuckets: Record<string, number> = {};
    const dailyBuckets: Record<string, number> = {};

    for (const row of allRows) {
      const d = new Date(row.date);
      if (isNaN(d.getTime())) continue;
      const month = d.getMonth();
      const day = d.getDate();
      const weekIdx = Math.min(3, Math.floor((day - 1) / 7));

      const weeklyKey = `${month}-${weekIdx}`;
      weeklyBuckets[weeklyKey] = (weeklyBuckets[weeklyKey] || 0) + (row.sales || 0);

      const dailyKey = `${month}-${day}`;
      dailyBuckets[dailyKey] = (dailyBuckets[dailyKey] || 0) + (row.sales || 0);
    }

    res.status(200).json({
      productId: productIdNum,
      year,
      totalRows: allRows.length,
      weeklyBuckets,
      dailyBuckets,
    });
  } catch (err) {
    console.error("Error fetching weekly sales:", err);
    res.status(500).json({ error: String(err) });
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
