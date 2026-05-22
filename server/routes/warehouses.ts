import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import { ListResponse, Warehouse } from "@shared/api";

export const getWarehouses: RequestHandler = async (req, res) => {
  try {
    const { data, error, count } = await supabase
      .from("warehouses")
      .select("*", { count: "exact" });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const response: ListResponse<Warehouse> = {
      data: data || [],
      count: count || 0,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching warehouses:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getWarehouseById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ data });
  } catch (err) {
    console.error("Error fetching warehouse:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
