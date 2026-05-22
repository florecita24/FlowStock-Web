import { RequestHandler } from "express";

export interface RecommendationExplanationRequest {
  product_name: string;
  warehouse_name: string;
  current_stock: number;
  predicted_demand_14d: number;
  target_stock: number;
  shortage: number;
  status: "Healthy" | "Critical" | "Overstock";
  recommended_action: "None" | "Transfer" | "Discount" | "Order";
}

export interface SolutionOption {
  title: string;
  description: string;
  costImpact: string;
  riskLevel: string;
  feasibility: string;
}

export interface RecommendationExplanationResponse {
  recommended_action: string;
  best_option: SolutionOption;
  alternative_option: SolutionOption;
}

/**
 * Generate AI-powered explanation for inventory recommendations using Gemini
 */
export const handleGenerateRecommendationExplanation: RequestHandler = async (
  req,
  res
) => {
  const {
    product_name,
    warehouse_name,
    current_stock,
    predicted_demand_14d,
    target_stock,
    shortage,
    status,
    recommended_action,
  } = req.body as RecommendationExplanationRequest;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key not configured",
        message: "Please set GEMINI_API_KEY environment variable",
      });
    }

    const modelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 12000);

    // Build prompt for Gemini
    const prompt = buildRecommendationPrompt(
      product_name,
      warehouse_name,
      current_stock,
      predicted_demand_14d,
      target_stock,
      shortage,
      status,
      recommended_action
    );

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                },
              ],
            },
          ],
        }),
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      const message = error.error?.message || response.statusText;

      // If Gemini is unavailable/quota-limited, return a deterministic fallback
      if (
        /quota|not found|not supported|exceeded/i.test(message) ||
        response.status === 429
      ) {
        return res.json(
          buildFallbackExplanation({
            product_name,
            warehouse_name,
            current_stock,
            predicted_demand_14d,
            target_stock,
            shortage,
            status,
            recommended_action,
          })
        );
      }

      throw new Error(`Gemini API error: ${message}`);
    }

    const result = await response.json();
    const content =
      result.contents?.[0]?.parts?.[0]?.text ||
      "Unable to generate recommendation";

    // Parse JSON response from Gemini
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from Gemini");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    res.json({
      recommended_action,
      best_option: parsed.best_option,
      alternative_option: parsed.alternative_option,
    });
  } catch (error) {
    console.error("Error generating recommendation explanation:", error);
    res.json(
      buildFallbackExplanation({
        product_name,
        warehouse_name,
        current_stock,
        predicted_demand_14d,
        target_stock,
        shortage,
        status,
        recommended_action,
      })
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

function buildFallbackExplanation(input: RecommendationExplanationRequest) {
  const { product_name, warehouse_name, current_stock, target_stock, shortage, status, recommended_action } = input;

  if (recommended_action === "Transfer") {
    return {
      recommended_action,
      best_option: {
        title: "Transfer stock from surplus warehouse",
        description: `Pindahkan stok ke ${warehouse_name} agar kebutuhan produk ${product_name} terpenuhi dengan biaya distribusi paling kecil. Ini biasanya paling hemat dibanding beli ulang dari supplier.`,
        costImpact: `Save biaya pembelian baru; transfer jauh lebih murah dari order penuh untuk shortage ${shortage} unit.`,
        riskLevel: "Low",
        feasibility: "High",
      },
      alternative_option: {
        title: "Order from supplier",
        description: `Kalau stok donor terbatas, lakukan PO ke supplier untuk menjaga layanan penjualan tetap aman. Biayanya lebih tinggi, tetapi supply lebih pasti.`,
        costImpact: "Cost lebih tinggi karena ada biaya pembelian dan lead time supplier.",
        riskLevel: "Medium",
        feasibility: "Medium",
      },
    };
  }

  if (recommended_action === "Order") {
    return {
      recommended_action,
      best_option: {
        title: "Order from supplier",
        description: `Stok di ${warehouse_name} tidak cukup untuk menutup demand ${shortage} unit. Ordering adalah opsi paling aman untuk menghindari stockout.`,
        costImpact: "Cost tertinggi di awal, tetapi mengurangi risiko lost sales.",
        riskLevel: "Low",
        feasibility: "High",
      },
      alternative_option: {
        title: "Transfer stock if possible",
        description: `Kalau ada warehouse lain dengan surplus untuk ${product_name}, transfer bisa lebih cepat dan lebih murah daripada menunggu supplier.`,
        costImpact: "Lebih murah dari order, tapi tergantung ketersediaan donor stock.",
        riskLevel: "Medium",
        feasibility: "Medium",
      },
    };
  }

  if (recommended_action === "Discount") {
    return {
      recommended_action,
      best_option: {
        title: "Apply discount",
        description: `Target stock ${target_stock} lebih rendah dari stok saat ini ${current_stock}. Diskon membantu mempercepat perputaran dan menurunkan holding cost.`,
        costImpact: "Save biaya penyimpanan dan risiko barang menumpuk.",
        riskLevel: "Low",
        feasibility: "High",
      },
      alternative_option: {
        title: "Hold and monitor",
        description: `Tahan stok sementara sambil memantau penjualan. Opsi ini aman, tetapi bisa membuat inventory tetap menumpuk lebih lama.`,
        costImpact: "Cost rendah sekarang, tetapi holding cost tetap berjalan.",
        riskLevel: "Medium",
        feasibility: "High",
      },
    };
  }

  return {
    recommended_action: "None",
    best_option: {
      title: "No action needed",
      description: `Stok saat ini ${current_stock} masih sesuai dengan target ${target_stock} dan status inventori ${status}. Tidak perlu tindakan operasional saat ini.`,
      costImpact: "No additional cost.",
      riskLevel: "Low",
      feasibility: "High",
    },
    alternative_option: {
      title: "Monitor daily",
      description: `Pantau penjualan harian untuk memastikan demand tidak berubah mendadak. Ini menjaga kesiapan tanpa mengeluarkan biaya tambahan.`,
      costImpact: "Minimal cost.",
      riskLevel: "Low",
      feasibility: "High",
    },
  };
}

function buildRecommendationPrompt(
  productName: string,
  warehouseName: string,
  currentStock: number,
  predictedDemand: number,
  targetStock: number,
  shortage: number,
  status: string,
  recommendedAction: string
): string {
  return `You are an inventory management AI advisor. Analyze this inventory situation and provide exactly 2 solution options in JSON format.

Product: ${productName}
Warehouse: ${warehouseName}
Current Stock: ${currentStock} units
Predicted Demand (14 days): ${predictedDemand} units
Target Stock: ${targetStock} units
Shortage: ${shortage} units
Status: ${status}
Recommended Action: ${recommendedAction}

Provide your response as valid JSON only (no markdown, no extra text) with this exact structure:
{
  "best_option": {
    "title": "Brief title of best solution",
    "description": "1-2 sentences explaining why this is best and what to do",
    "costImpact": "Estimated cost/savings (e.g., 'Save Rp 500,000' or 'Cost Rp 1,000,000')",
    "riskLevel": "Low/Medium/High",
    "feasibility": "High/Medium/Low"
  },
  "alternative_option": {
    "title": "Brief title of alternative",
    "description": "1-2 sentences explaining this alternative and its tradeoffs",
    "costImpact": "Estimated cost/savings",
    "riskLevel": "Low/Medium/High",
    "feasibility": "High/Medium/Low"
  }
}

Rules:
- Best option should minimize cost/maximize efficiency
- Alternative should be realistic but possibly riskier or more expensive
- For Transfer: best = transfer from surplus warehouse, alternative = order from supplier
- For Order: best = order from supplier, alternative = transfer if possible (even if risky)
- For Discount: best = apply discount to reduce overstock, alternative = hold and monitor
- Consider ${shortage} units shortage and ${predictedDemand} units demand
- Base cost estimates on typical warehouse transfer costs (Rp 5,000-10,000/unit) and supplier costs (Rp 10,000-20,000/unit)`;
}
