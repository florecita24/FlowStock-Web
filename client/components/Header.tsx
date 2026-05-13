export default function Header() {
  return (
    <div className="h-16 bg-background border-b border-gray-200 flex items-center px-8">
      <p className="text-sm">
        <span className="text-muted-foreground">FlowStock</span>
        <span className="text-foreground font-semibold">&nbsp;/ Main Dashboard</span>
      </p>
    </div>
  );
}
