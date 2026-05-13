import { useState } from "react";
import { Upload, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";

interface AuditLog {
  dateTrained: string;
  modelVersion: string;
  accuracy: string;
  status: "Deployed / Active" | "Archived";
}

interface ActionLog {
  timestamp: string;
  user: string;
  userInitials: string;
  userBg: string;
  action: string;
  status: "Success";
}

const auditLogs: AuditLog[] = [
  {
    dateTrained: "29 Mar 2026, 02:00",
    modelVersion: "Prophet-v2.1",
    accuracy: "4.2% error",
    status: "Deployed / Active",
  },
  {
    dateTrained: "15 Feb 2026, 02:00",
    modelVersion: "Prophet-v2.0",
    accuracy: "5.8% error",
    status: "Archived",
  },
  {
    dateTrained: "01 Jan 2026, 02:00",
    modelVersion: "Prophet-v1.0",
    accuracy: "8.4% error",
    status: "Archived",
  },
];

const actionLogs: ActionLog[] = [
  {
    timestamp: "29 Mar 2026, 14:00",
    user: "Manager_Andi",
    userInitials: "MA",
    userBg: "bg-orange-200",
    action: "Approved Cross-docking 500 Pencils JKT + BDO",
    status: "Success",
  },
  {
    timestamp: "29 Mar 2026, 11:30",
    user: "System_Auto",
    userInitials: "SA",
    userBg: "bg-purple-200",
    action: "Triggered retraining with new holiday data",
    status: "Success",
  },
  {
    timestamp: "28 Mar 2026, 09:15",
    user: "Manager_Budi",
    userInitials: "MB",
    userBg: "bg-blue-200",
    action: "Ignored supplier restock recommendation (SKU-103)",
    status: "Success",
  },
];

export default function SystemManagement() {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    // Handle file drop
  };

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            System Architecture & Audit Logs
          </h1>
          <p className="text-sm text-white mt-1">
            Central control for database management, ML performance monitoring,
            and action transparency.
          </p>
        </div>

        {/* Database Management Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-orange-200 rounded-lg flex items-center justify-center">
              <span className="text-orange-700 font-bold text-sm">📦</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Database Management (DuckDB)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Update stored historical data to retrain the AI.
              </p>
            </div>
          </div>

          {/* Drag and Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-xl p-12 text-center transition-colors",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30"
            )}
          >
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-semibold text-foreground mb-2">
              Drag and drop CSV/Excel file here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse from your computer
            </p>
            <Button className="bg-primary text-primary-foreground">
              Sync & Retrain Model
            </Button>
          </div>
        </div>

        {/* AI Performance Audit Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center">
                <span className="text-purple-700 font-bold text-sm">●</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  AI Performance Audit (MLflow)
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Monitor the accuracy and health of deployed predictive models.
                </p>
              </div>
            </div>
            <a
              href="#"
              className="text-sm font-medium text-primary hover:underline"
            >
              View Details
            </a>
          </div>

          {/* Audit Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Date Trained
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Model Version
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Accuracy / Error Rate
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/50">
                    <td className="py-4 px-4 text-foreground">
                      {log.dateTrained}
                    </td>
                    <td className="py-4 px-4 text-foreground">
                      {log.modelVersion}
                    </td>
                    <td className="py-4 px-4 text-foreground">
                      {log.accuracy}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          "inline-block px-3 py-1 rounded-full text-xs font-semibold",
                          log.status === "Deployed / Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-700"
                        )}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Executive Action Log Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-200 rounded-lg flex items-center justify-center">
                <span className="text-red-700 font-bold text-sm">●</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Executive Action Log
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Transparent audit trail of operational decisions and system
                  activities.
                </p>
              </div>
            </div>
            <button className="text-sm font-medium text-primary hover:underline">
              Refresh Status
            </button>
          </div>

          {/* Action Log Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Timestamp
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    User
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Action
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {actionLogs.map((log, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/50">
                    <td className="py-4 px-4 text-foreground">
                      {log.timestamp}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            log.userBg
                          )}
                        >
                          {log.userInitials}
                        </div>
                        <span className="text-foreground">{log.user}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-foreground max-w-sm">
                      {log.action}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
