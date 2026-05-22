import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleInventoryRecommendations } from "./routes/inventory-recommendations";
import { handleActionAlerts } from "./routes/action-alerts";
import { handleGenerateRecommendationExplanation } from "./routes/generate-recommendation-explanation";

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

  // Inventory AI recommendations from model
  app.get("/api/inventory-recommendations", handleInventoryRecommendations);

  // Top dashboard alerts ranked from inventory_ai_recommendations.csv
  app.get("/api/action-alerts", handleActionAlerts);

  // Generate recommendation explanation via Gemini
  app.post(
    "/api/generate-recommendation-explanation",
    handleGenerateRecommendationExplanation
  );

  return app;
}
