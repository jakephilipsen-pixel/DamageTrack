import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Plus, Pencil, X, Upload } from "lucide-react";
import { apiGet, apiPost, apiPut, apiPostForm } from "../../lib/api";
import { useToast } from "../../hooks/useToast";
import { DataTable, type Column } from "../../components/DataTable";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import type { Product, CsvImportResult } from "../../types";

export function ProductsTab() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(
    null
  );

  // Form
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [customer, setCustomer] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await apiGet<Product[]>("/products?active=true");
      setProducts(data);
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to load products"
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openAdd = () => {
    setEditing(null);
    setSku("");
    setDescription("");
    setCustomer("");
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setSku(p.sku);
    setDescription(p.description);
    setCustomer(p.customer);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editing) {
        await apiPut(`/products/${editing.id}`, { sku, description, customer });
        addToast("success", "Product updated");
      } else {
        await apiPost("/products", { sku, description, customer });
        addToast("success", "Product created");
      }
      closeForm();
      fetchProducts();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to save product"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      await apiPut(`/products/${p.id}`, { active: !p.active });
      addToast("success", `Product ${p.active ? "deactivated" : "activated"}`);
      fetchProducts();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to update product"
      );
    }
  };

  const handleCsvImport = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiPostForm<CsvImportResult>(
        "/products/import-csv",
        formData
      );
      setImportResult(result);
      addToast(
        "success",
        `Imported: ${result.created} created, ${result.updated} updated`
      );
      fetchProducts();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "CSV import failed"
      );
    }
  };

  const columns: Column<Product>[] = [
    {
      key: "sku",
      header: "SKU",
      render: (p) => <span className="font-mono text-xs text-primary">{p.sku}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (p) => <span className="text-white">{p.description}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (p) => <span className="text-slate-300">{p.customer}</span>,
      hideOnMobile: true,
    },
    {
      key: "active",
      header: "Active",
      render: (p) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleActive(p);
          }}
          className={`w-10 h-6 rounded-full transition-colors relative ${
            p.active ? "bg-primary" : "bg-white/10"
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              p.active ? "left-5" : "left-1"
            }`}
          />
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEdit(p);
          }}
          className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Pencil size={16} />
        </button>
      ),
      className: "w-12",
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {/* Actions bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors min-h-[44px]"
        >
          <Plus size={16} />
          Add Product
        </button>
        <button
          onClick={() => {
            setShowImport(true);
            setImportResult(null);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-white/5 text-slate-300 text-sm hover:bg-white/10 transition-colors min-h-[44px]"
        >
          <Upload size={16} />
          Import CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-dark-800 border border-white/5 rounded-lg">
        <DataTable
          columns={columns}
          data={products}
          keyExtractor={(p) => p.id}
          emptyMessage="No products found"
        />
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeForm} />
          <div className="relative bg-dark-800 border border-white/10 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editing ? "Edit Product" : "Add Product"}
              </h3>
              <button
                onClick={closeForm}
                className="p-1 rounded hover:bg-white/10 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">SKU</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-md bg-dark-700 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-md bg-dark-700 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Customer
                </label>
                <input
                  type="text"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-md bg-dark-700 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 min-h-[44px]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 rounded-md bg-white/5 text-slate-300 text-sm hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {formLoading ? "Saving..." : editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowImport(false)}
          />
          <div className="relative bg-dark-800 border border-white/10 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Import CSV</h3>
              <button
                onClick={() => setShowImport(false)}
                className="p-1 rounded hover:bg-white/10 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Upload a CSV with columns: <code className="text-primary">sku</code>,{" "}
              <code className="text-primary">description</code>,{" "}
              <code className="text-primary">customer</code>
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCsvImport(file);
              }}
              className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {importResult && (
              <div className="mt-4 p-3 rounded-md bg-dark-700 text-sm">
                <p className="text-primary font-medium">{importResult.message}</p>
                <p className="text-slate-300 mt-1">
                  Created: {importResult.created} | Updated:{" "}
                  {importResult.updated} | Total: {importResult.total}
                </p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2 text-red-400">
                    <p className="font-medium">Errors:</p>
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs mt-0.5">
                        {err}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
