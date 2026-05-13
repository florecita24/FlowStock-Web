import { useState } from "react";
import { Search, Mail, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  company: string;
  poNumber: string;
  subject: string;
  tags: string[];
  timeAgo: string;
  preview: string;
  email?: string;
  initials: string;
  bgColor: string;
  priority: "URGENT" | "DAMAGED" | "INQUIRY" | "HIGH";
}

const tickets: Ticket[] = [
  {
    id: "1",
    company: "Toko Maju Jaya",
    poNumber: "[PO-99281]",
    subject: "Keterlambatan Pengiriman...",
    tags: ["URGENT", "LATE DELIVERY"],
    timeAgo: "10m ago",
    preview: "Paket kami ke cabang Jakarta belum sampai...",
    email: "maju.jaya@example.com",
    initials: "TM",
    bgColor: "bg-orange-100",
    priority: "URGENT",
  },
  {
    id: "2",
    company: "CV Makeur Abadi",
    poNumber: "",
    subject: "Barang rusak saat diterima",
    tags: ["DAMAGED"],
    timeAgo: "5h ago",
    preview: "Ada 5 box yang kena sadar...",
    email: "",
    initials: "CM",
    bgColor: "bg-red-100",
    priority: "DAMAGED",
  },
  {
    id: "3",
    company: "Retailer X - JKT",
    poNumber: "",
    subject: "Tanya stok bulan depan",
    tags: ["INQUIRY"],
    timeAgo: "2d ago",
    preview: "Apakah stok untuk barang SKU-1233 akan...",
    email: "",
    initials: "RX",
    bgColor: "bg-blue-100",
    priority: "INQUIRY",
  },
  {
    id: "4",
    company: "Supermarket ABC",
    poNumber: "",
    subject: "Perubahan alamat pengiriman",
    tags: [],
    timeAgo: "5d ago",
    preview: "Mohon bantuan untuk mengubah alamat...",
    email: "",
    initials: "SA",
    bgColor: "bg-gray-100",
    priority: "INQUIRY",
  },
];

const getTagColor = (tag: string) => {
  switch (tag) {
    case "URGENT":
      return "bg-red-200 text-red-700";
    case "LATE DELIVERY":
      return "bg-orange-200 text-orange-700";
    case "DAMAGED":
      return "bg-yellow-200 text-yellow-700";
    case "INQUIRY":
      return "bg-blue-200 text-blue-700";
    default:
      return "bg-gray-200 text-gray-700";
  }
};

export default function CustomerIssueAnalyzer() {
  const [selectedTicket, setSelectedTicket] = useState(tickets[0]);

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Automated Ticket & Issue Routing
          </h1>
          <p className="text-sm text-white mt-1">
            AI-powered categorization and prioritization of incoming support
            tickets.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Inbox */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Live Inbox</h2>
              <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                3 New
              </span>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  className="pl-10 w-full"
                />
              </div>
            </div>

            {/* Tickets List */}
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border transition-all",
                    selectedTicket.id === ticket.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm",
                        ticket.bgColor
                      )}
                    >
                      {ticket.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">
                        {ticket.company}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ticket.subject}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ticket.tags.map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              "text-xs font-semibold px-2 py-1 rounded",
                              getTagColor(tag)
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {ticket.timeAgo}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Details */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-border">
            {/* Header with Avatar and Stats */}
            <div className="flex items-start justify-between mb-6 pb-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg",
                    selectedTicket.bgColor
                  )}
                >
                  {selectedTicket.initials}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">
                    {selectedTicket.company}
                  </h3>
                  {selectedTicket.email && (
                    <p className="text-sm text-muted-foreground">
                      {selectedTicket.email}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {selectedTicket.timeAgo}
                  </p>
                </div>
              </div>

              {/* Stats Circle Chart */}
              <div className="text-center">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    {/* Colored arc for 80% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#8b5a3c"
                      strokeWidth="8"
                      strokeDasharray="226.2 282.7"
                      strokeLinecap="round"
                      style={{
                        transform: "rotate(-90deg)",
                        transformOrigin: "50px 50px",
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">
                      80%
                    </span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-foreground mt-2">
                  Live Delivery
                </p>
                <p className="text-xs text-muted-foreground">40% Engagement</p>
              </div>
            </div>

            {/* Ticket Title */}
            <div className="mb-6">
              <h4 className="font-bold text-foreground text-lg">
                {selectedTicket.poNumber} {selectedTicket.subject}
              </h4>
              {selectedTicket.subject.includes("Keterlambatan Pengiriman") && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">
                    Halo tim FlowStock,
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Pesanan kami ke cabang Sudirman belum sampai padahal besok
                    toko kami akan membuka grand opening. Mohon segera dicek
                    posisnya karena kami sangat membutuhkan barang tersebut hari
                    ini untuk oprasional.
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Mohon konfirmasinya agar kami bisa bersiap.
                  </p>
                  <p className="text-sm text-foreground mt-4">
                    Terima kasih,
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    Budi Santoso
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Toko Maju Jaya
                  </p>
                </div>
              )}
              {!selectedTicket.subject.includes("Keterlambatan Pengiriman") && (
                <div className="mt-4">
                  <p className="text-sm text-foreground leading-relaxed">
                    {selectedTicket.preview}
                  </p>
                </div>
              )}
            </div>

            {/* AI Summary & Routing */}
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <h5 className="font-bold text-foreground mb-3">
                AI Summary & Routing
              </h5>
              <p className="text-sm text-foreground leading-relaxed">
                Pengiriman B2B (Toko Maju Jaya) mengalami{" "}
                <span className="font-semibold">keterlambatan pengiriman</span>{" "}
                untuk PO-99281 yang sangat mendesak karena acara{" "}
                <span className="font-semibold">grand opening besok</span>. Sistem
                merekomendasikan eskalasi segera ke{" "}
                <span className="font-semibold">Fleet Team</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
