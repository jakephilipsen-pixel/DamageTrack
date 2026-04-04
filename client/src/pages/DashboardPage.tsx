import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter } from "lucide-react";
import { apiGet } from "../lib/api";
import { formatDateTime, faultLabel, faultColor, cn } from "../lib/utils";
import { useToast } from "../hooks/useToast";
import { DataTable, type Column } from "../components/DataTable";
import { Pagination } from "../components/Pagination";
import { LoadingSpinner } from "../components/LoadingSpinner";
import type { DamageReport, PaginatedResponse } from "../types";

export function DashboardPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [faultOf, setFaultOf] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (faultOf) params.set("faultOf", faultOf);

      const res = await apiGet<PaginatedResponse<DamageReport>>(
        `/reports?${params.toString()}`
      );
      setReports(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, faultOf, addToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSearch = () => {
    setPage(1);
    // fetchReports will be triggered by page change or dependency change
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setFaultOf("");
    setPage(1);
  };

  const columns: Column<DamageReport>[] = [
    {
      key: "reference",
      header: "Reference",
      render: (r) => (
        <span className="font-mono text-xs text-primary">{r.reference}</span>
      ),
    },
    {
      key: "dateTime",
      header: "Date/Time",
      render: (r) => (
        <span className="text-slate-300">{formatDateTime(r.dateTime)}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: "product",
      header: "Product",
      render: (r) => (
        <div className="min-w-0">
          <div className="text-white truncate max-w-[200px]">
            {r.product.description}
          </div>
          <div className="text-xs text-slate-500">{r.product.sku}</div>
        </div>
      ),
    },
    {
      key: "employee",
      header: "Employee",
      render: (r) => <span className="text-slate-300">{r.employee.name}</span>,
      hideOnMobile: true,
    },
    {
      key: "reason",
      header: "Reason",
      render: (r) => <span className="text-slate-300">{r.reason.text}</span>,
      hideOnMobile: true,
    },
    {
      key: "faultOf",
      header: "Fault Of",
      render: (r) => (
        <span
          className={cn(
            "inline-block px-2 py-0.5 rounded text-xs font-medium",
            faultColor(r.faultOf)
          )}
        >
          {faultLabel(r.faultOf)}
        </span>
      ),
    },
    {
      key: "photos",
      header: "Photos",
      render: (r) => (
        <span className="text-slate-400">{r.photos.length}</span>
      ),
      hideOnMobile: true,
    },
  ];

  // Mobile card view
  const MobileCards = () => (
    <div className="space-y-3 lg:hidden">
      {reports.map((r) => (
        <button
          key={r.id}
          onClick={() => navigate(`/reports/${r.id}`)}
          className="w-full text-left bg-dark-800 border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-primary">
              {r.reference}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                faultColor(r.faultOf)
              )}
            >
              {faultLabel(r.faultOf)}
            </span>
          </div>
          <p className="text-sm text-white truncate">{r.product.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span>{formatDateTime(r.dateTime)}</span>
            <span>{r.employee.name}</span>
            <span>{r.photos.length} photo{r.photos.length !== 1 ? "s" : ""}</span>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            {total} damage report{total !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => navigate("/reports/new")}
          className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          <Plus size={18} />
          New Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-dark-800 border border-white/5 rounded-lg mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-4 py-3 lg:hidden"
        >
          <span className="flex items-center gap-2 text-sm text-slate-300">
            <Filter size={16} />
            Filters
          </span>
          {(dateFrom || dateTo || faultOf) && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
              Active
            </span>
          )}
        </button>

        <div
          className={cn(
            "px-4 pb-4 space-y-3 lg:space-y-0 lg:flex lg:items-end lg:gap-4 lg:p-4",
            !showFilters && "hidden lg:flex"
          )}
        >
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-dark-700 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 min-h-[44px]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-dark-700 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 min-h-[44px]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">
              Fault Of
            </label>
            <select
              value={faultOf}
              onChange={(e) => setFaultOf(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-dark-700 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 min-h-[44px]"
            >
              <option value="">All</option>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="TRANSPORT">Transport</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors min-h-[44px]"
            >
              <Search size={16} />
              Search
            </button>
            {(dateFrom || dateTo || faultOf) && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-md bg-white/5 text-slate-300 text-sm hover:bg-white/10 transition-colors min-h-[44px]"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-dark-800 border border-white/5 rounded-lg">
            <DataTable
              columns={columns}
              data={reports}
              onRowClick={(r) => navigate(`/reports/${r.id}`)}
              keyExtractor={(r) => r.id}
              emptyMessage="No damage reports found"
            />
          </div>

          {/* Mobile cards */}
          {reports.length === 0 ? (
            <div className="lg:hidden text-center py-12 text-slate-400">
              No damage reports found
            </div>
          ) : (
            <MobileCards />
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Mobile FAB */}
      <button
        onClick={() => navigate("/reports/new")}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary-hover transition-colors z-30"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
