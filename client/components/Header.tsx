import { useLocation } from "react-router-dom";

const pageNames: Record<string, string> = {
  "/": "Main Dashboard",
  "/inventory": "Inventory Management",
  "/sales": "Sales Prediction",
};

export default function Header() {
  const location = useLocation();
  const pageName = pageNames[location.pathname] ?? "FlowStock";

  return (
    <div className="h-16 bg-background border-b border-gray-200 flex items-center px-8">
      <p className="text-sm font-medium text-foreground">
        FlowStock
        <span className="text-muted-foreground mx-1">/</span>
        {pageName}
      </p>
    </div>
  );
}
