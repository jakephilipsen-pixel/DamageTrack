import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Trash2,
  Mail,
  Calendar,
  User,
  Package,
  AlertTriangle,
  FileText,
  Hash,
  Camera,
} from "lucide-react";
import { apiGet, apiDelete, apiPost } from "../lib/api";
import {
  formatDateTime,
  faultLabel,
  faultColor,
  photoUrl,
  thumbnailUrl,
  cn,
} from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Lightbox } from "../components/Lightbox";
import type { DamageReport } from "../types";

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  const [report, setReport] = useState<DamageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      const data = await apiGet<DamageReport>(`/reports/${id}`);
      setReport(data);
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to load report"
      );
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, addToast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDelete(`/reports/${id}`);
      addToast("success", "Report deleted successfully");
      navigate("/");
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to delete report"
      );
    } finally {
      setDeleting(false);
      setDeleteDialog(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await apiPost(`/export/email/${id}`);
      addToast("success", "Export data generated successfully");
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to export report"
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!report) return null;

  const lightboxImages = report.photos.map((p) => ({
    src: photoUrl(p.filename),
    alt: `Photo ${p.filename}`,
  }));

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white font-mono">
              {report.reference}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Created {formatDateTime(report.createdAt)}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/10 text-secondary text-sm hover:bg-secondary/20 transition-colors min-h-[44px] disabled:opacity-50"
            >
              <Mail size={16} />
              <span className="hidden sm:inline">
                {exporting ? "Exporting..." : "Export"}
              </span>
            </button>
            <button
              onClick={() => setDeleteDialog(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors min-h-[44px]"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Report details */}
      <div className="bg-dark-800 border border-white/5 rounded-lg divide-y divide-white/5">
        <DetailRow
          icon={Package}
          label="Product"
          value={
            <div>
              <span className="text-white">{report.product.description}</span>
              <span className="text-xs text-slate-500 ml-2">
                {report.product.sku}
              </span>
              <div className="text-xs text-slate-400 mt-0.5">
                Customer: {report.product.customer}
              </div>
            </div>
          }
        />
        <DetailRow
          icon={User}
          label="Employee"
          value={<span className="text-white">{report.employee.name}</span>}
        />
        <DetailRow
          icon={FileText}
          label="Reason"
          value={<span className="text-white">{report.reason.text}</span>}
        />
        <DetailRow
          icon={AlertTriangle}
          label="Fault Of"
          value={
            <span
              className={cn(
                "inline-block px-2.5 py-1 rounded text-xs font-medium",
                faultColor(report.faultOf)
              )}
            >
              {faultLabel(report.faultOf)}
            </span>
          }
        />
        <DetailRow
          icon={Hash}
          label="Quantity"
          value={<span className="text-white">{report.quantity}</span>}
        />
        <DetailRow
          icon={Calendar}
          label="Date/Time"
          value={
            <span className="text-white">
              {formatDateTime(report.dateTime)}
            </span>
          }
        />
        {report.notes && (
          <DetailRow
            icon={FileText}
            label="Notes"
            value={
              <span className="text-slate-300 whitespace-pre-wrap">
                {report.notes}
              </span>
            }
          />
        )}
        <DetailRow
          icon={User}
          label="Created By"
          value={
            <span className="text-slate-300">{report.user.username}</span>
          }
        />
      </div>

      {/* Photos */}
      <div className="mt-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
          <Camera size={20} className="text-slate-400" />
          Photos ({report.photos.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {report.photos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => setLightboxIndex(index)}
              className="aspect-square rounded-lg overflow-hidden border border-white/5 hover:border-primary/30 transition-colors group"
            >
              <img
                src={thumbnailUrl(photo.thumbnail)}
                alt={`Damage photo ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteDialog}
        title="Delete Report"
        message={`Are you sure you want to delete report ${report.reference}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(false)}
        loading={deleting}
      />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 px-4 py-3 sm:px-6">
      <Icon size={18} className="text-slate-500 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500 mb-0.5">{label}</div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}
