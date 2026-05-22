import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  getProducts,
  getProductById,
} from "./routes/products";
import {
  getWarehouses,
  getWarehouseById,
} from "./routes/warehouses";
import {
  getInventory,
  getInventoryByWarehouse,
  getInventoryByProduct,
  syncInventory,
} from "./routes/inventory";
import {
  getStoreSales,
  getStoreSalesByWarehouse,
  getStoreSalesByDateRange,
  getWeeklySalesByProduct,
} from "./routes/store-sales";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Products routes
  app.get("/api/products", getProducts);
  app.get("/api/products/:id", getProductById);

  // Warehouses routes
  app.get("/api/warehouses", getWarehouses);
  app.get("/api/warehouses/:id", getWarehouseById);

  // Inventory routes
  app.get("/api/inventory", getInventory);
  app.post("/api/inventory/sync", syncInventory);
  app.get("/api/inventory/warehouse/:warehouseId", getInventoryByWarehouse);
  app.get("/api/inventory/product/:productId", getInventoryByProduct);

  // Store Sales routes
  app.get("/api/store-sales", getStoreSales);
  app.get("/api/store-sales/warehouse/:warehouseId", getStoreSalesByWarehouse);
  app.get("/api/store-sales/date-range", getStoreSalesByDateRange);
  app.get("/api/store-sales/weekly/product/:productId", getWeeklySalesByProduct);

  return app;
}
