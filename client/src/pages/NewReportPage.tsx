import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiGet, apiPostForm } from "../lib/api";
import { formatDateForInput } from "../lib/utils";
import { useToast } from "../hooks/useToast";
import {
  SearchableSelect,
  type SelectOption,
} from "../components/SearchableSelect";
import { FileUpload } from "../components/FileUpload";
import { LoadingSpinner } from "../components/LoadingSpinner";
import type { Product, Employee, Reason, DamageReport } from "../types";

export function NewReportPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reference data
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);

  // Form fields
  const [productId, setProductId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [faultOf, setFaultOf] = useState<"" | "WAREHOUSE" | "TRANSPORT">("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [dateTime, setDateTime] = useState(formatDateForInput(new Date()));
  const [photos, setPhotos] = useState<File[]>([]);

  // Load reference data
  useEffect(() => {
    const load = async () => {
      try {
        const [prods, emps, rsns] = await Promise.all([
          apiGet<Product[]>("/products?active=true"),
          apiGet<Employee[]>("/employees"),
          apiGet<Reason[]>("/reasons"),
        ]);
        setProducts(prods);
        setEmployees(emps);
        setReasons(rsns);
      } catch (err) {
        addToast(
          "error",
          err instanceof Error ? err.message : "Failed to load form data"
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [addToast]);

  // Build options
  const productOptions: SelectOption[] = products.map((p) => ({
    value: p.id,
    label: `${p.sku} - ${p.description}`,
    sublabel: p.customer,
  }));

  const employeeOptions: SelectOption[] = employees.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  const reasonOptions: SelectOption[] = reasons.map((r) => ({
    value: r.id,
    label: r.text,
  }));

  const isValid =
    productId && employeeId && reasonId && faultOf && photos.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("productId", productId);
      formData.append("employeeId", employeeId);
      formData.append("reasonId", reasonId);
      formData.append("faultOf", faultOf);
      formData.append("quantity", quantity || "1");
      if (notes.trim()) formData.append("notes", notes.trim());
      formData.append("dateTime", new Date(dateTime).toISOString());

      for (const photo of photos) {
        formData.append("photos", photo);
      }

      const report = await apiPostForm<DamageReport>("/reports", formData);
      addToast("success", `Report ${report.reference} created successfully`);
      navigate("/");
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to create report"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">New Damage Report</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Fill in all required fields
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Product <span className="text-red-400">*</span>
          </label>
          <SearchableSelect
            options={productOptions}
            value={productId}
            onChange={setProductId}
            placeholder="Search by SKU or description..."
            searchPlaceholder="Type SKU to search..."
          />
        </div>

        {/* Employee */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Employee <span className="text-red-400">*</span>
          </label>
          <SearchableSelect
            options={employeeOptions}
            value={employeeId}
            onChange={setEmployeeId}
            placeholder="Select employee..."
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Reason <span className="text-red-400">*</span>
          </label>
          <SearchableSelect
            options={reasonOptions}
            value={reasonId}
            onChange={setReasonId}
            placeholder="Select reason..."
          />
        </div>

        {/* Fault Of */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Fault Of <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFaultOf("WAREHOUSE")}
              className={`flex-1 py-3 px-4 rounded-md border text-sm font-medium transition-colors min-h-[44px] ${
                faultOf === "WAREHOUSE"
                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                  : "border-white/10 bg-dark-700 text-slate-400 hover:border-white/20"
              }`}
            >
              Warehouse
            </button>
            <button
              type="button"
              onClick={() => setFaultOf("TRANSPORT")}
              className={`flex-1 py-3 px-4 rounded-md border text-sm font-medium transition-colors min-h-[44px] ${
                faultOf === "TRANSPORT"
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-white/10 bg-dark-700 text-slate-400 hover:border-white/20"
              }`}
            >
              Transport
            </button>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2.5 rounded-md bg-dark-700 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors min-h-[44px]"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Notes <span className="text-slate-500">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-md bg-dark-700 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-primary/50 transition-colors resize-none"
            placeholder="Additional details about the damage..."
          />
        </div>

        {/* Date & Time */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Date & Time
          </label>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-md bg-dark-700 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors min-h-[44px]"
          />
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Photos <span className="text-red-400">*</span>
          </label>
          <FileUpload files={photos} onChange={setPhotos} maxFiles={10} />
          {photos.length === 0 && (
            <p className="text-xs text-slate-500 mt-1">
              At least 1 photo is required
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2 pb-4">
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
          >
            {submitting ? "Submitting..." : "Submit Damage Report"}
          </button>
        </div>
      </form>
    </div>
  );
}
