import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { ArrowRight } from "lucide-react";

export default function Placeholder() {
  const location = useLocation();

  const getPageName = (pathname: string) => {
    const segments: Record<string, string> = {
      "/inventory": "Inventory Management",
      "/sales": "Sales Prediction",
      "/issues": "Customer Issue Analyzer",
      "/system": "System & AI Management",
    };
    return segments[pathname] || "Page";
  };

  return (
    <Layout>
      <div className="p-8 h-full flex items-center justify-center">
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-border max-w-md text-center">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ArrowRight className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {getPageName(location.pathname)}
          </h2>
          <p className="text-muted-foreground mb-6">
            This page is ready to be customized. Continue chatting to fill in the content and design for this section.
          </p>
          <div className="inline-block px-4 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
            {location.pathname}
          </div>
        </div>
      </div>
    </Layout>
  );
}
