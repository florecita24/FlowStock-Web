import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <div className="h-16 bg-background border-b border-gray-200 flex items-center justify-between px-8">
      {/* Breadcrumb and Title */}
      <div className="flex items-center gap-4">
        <p className="text-sm">
          <span className="text-muted-foreground">FlowStock</span>
          <span className="text-foreground font-semibold">/&nbsp;Main Dashboard</span>
        </p>
      </div>

      {/* Search and Notifications */}
      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search Inventory, SKUs..."
            className="pl-10 w-64 bg-white border border-gray-300"
          />
        </div>
        <Button variant="ghost" size="sm" className="relative border border-gray-300 hover:bg-gray-100">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </Button>
      </div>
    </div>
  );
}
