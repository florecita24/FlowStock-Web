import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import { ListResponse, Product } from "@shared/api";

export const getProducts: RequestHandler = async (req, res) => {
  try {
    const { data, error, count } = await supabase
      .from("products")
      .select("*", { count: "exact" });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({ error: error.message });
    }

    console.log(`Products fetched: ${count} items`);

    const response: ListResponse<Product> = {
      data: data || [],
      count: count || 0,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: String(err) });
  }
};

export const getProductById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ data });
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
