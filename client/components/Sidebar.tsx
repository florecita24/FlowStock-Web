import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    {
      label: "Main Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      label: "Inventory Management",
      href: "/inventory",
      icon: Package,
    },
    {
      label: "Sales Prediction",
      href: "/sales",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="w-40 bg-sidebar border-r border-sidebar-border flex flex-col py-6 px-4">
      {/* Logo */}
      <div className="mb-8 px-2">
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2F18e959be0d9d48c18aa708fdd96a5ba1%2Ff92fec997efb4a8daa106b7fb0b4e757?format=webp&width=200&height=80"
          alt="FlowStock Logo"
          className="h-12 w-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="pt-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
            SJ
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              Sarah Jenkins
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Supply Chain
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
