import { useState } from "react";
import { Download, FileText, BarChart3, Truck, Warehouse } from "lucide-react";
import { apiPost } from "../../lib/api";
import { useToast } from "../../hooks/useToast";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import type { BulkExportResponse } from "../../types";

export function ExportTab() {
  const { addToast } = useToast();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<BulkExportResponse | null>(null);

  const handleExport = async () => {
    if (!dateFrom || !dateTo) {
      addToast("error", "Please select both date from and date to");
      return;
    }

    setExporting(true);
    try {
      const data = await apiPost<BulkExportResponse>("/export/bulk", {
        dateFrom,
        dateTo,
      });
      setResult(data);
      addToast("success", `Exported ${data.summary.totalReports} reports`);
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Export failed"
      );
    } finally {
      setExporting(false);
    }
  };

  const downloadCsv = () => {
    if (!result) return;

    const headers = [
      "Reference",
      "Date/Time",
      "SKU",
      "Product",
      "Customer",
      "Employee",
      "Reason",
      "Fault Of",
      "Quantity",
      "Notes",
      "Photo Count",
      "Created By",
    ];

    const rows = result.reports.map((r) => [
      r.reference,
      r.dateTime,
      r.product.sku,
      r.product.description,
      r.product.customer,
      r.employee,
      r.reason,
      r.faultOf,
      String(r.quantity),
      r.notes || "",
      String(r.photoCount),
      r.createdBy,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `damage-reports-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => {
    if (!result) return;

    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `damage-reports-${dateFrom}-to-${dateTo}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl">
      {/* Date range */}
      <div className="bg-dark-800 border border-white/5 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-white mb-4">
          Export Date Range
        </h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-dark-700 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 min-h-[44px]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-dark-700 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 min-h-[44px]"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleExport}
              disabled={exporting || !dateFrom || !dateTo}
              className="flex items-center gap-2 px-5 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {exporting ? (
                <LoadingSpinner size={16} />
              ) : (
                <Download size={16} />
              )}
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard
              icon={FileText}
              label="Total Reports"
              value={result.summary.totalReports}
              color="text-primary"
            />
            <StatCard
              icon={Warehouse}
              label="Warehouse Fault"
              value={result.summary.byFault.warehouse}
              color="text-amber-400"
            />
            <StatCard
              icon={Truck}
              label="Transport Fault"
              value={result.summary.byFault.transport}
              color="text-blue-400"
            />
          </div>

          {/* Download buttons */}
          <div className="bg-dark-800 border border-white/5 rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-4">
              Download Export
            </h3>
            <div className="flex gap-3">
              <button
                onClick={downloadCsv}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-white/5 text-slate-300 text-sm hover:bg-white/10 transition-colors min-h-[44px]"
              >
                <FileText size={16} />
                Download CSV
              </button>
              <button
                onClick={downloadJson}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-white/5 text-slate-300 text-sm hover:bg-white/10 transition-colors min-h-[44px]"
              >
                <BarChart3 size={16} />
                Download JSON
              </button>
            </div>
          </div>

          {/* Report preview table */}
          {result.reports.length > 0 && (
            <div className="mt-6 bg-dark-800 border border-white/5 rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">
                      Reference
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">
                      Product
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase hidden sm:table-cell">
                      Employee
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">
                      Fault
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase hidden sm:table-cell">
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.reports.slice(0, 20).map((r) => (
                    <tr
                      key={r.reference}
                      className="border-b border-white/5"
                    >
                      <td className="py-2 px-4 font-mono text-xs text-primary">
                        {r.reference}
                      </td>
                      <td className="py-2 px-4 text-white truncate max-w-[200px]">
                        {r.product.description}
                      </td>
                      <td className="py-2 px-4 text-slate-300 hidden sm:table-cell">
                        {r.employee}
                      </td>
                      <td className="py-2 px-4 text-slate-300">
                        {r.faultOf}
                      </td>
                      <td className="py-2 px-4 text-slate-300 hidden sm:table-cell">
                        {r.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.reports.length > 20 && (
                <div className="py-3 px-4 text-sm text-slate-400 border-t border-white/5">
                  Showing 20 of {result.reports.length} reports. Download the
                  full export for complete data.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-dark-800 border border-white/5 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <Icon size={20} className={color} />
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
