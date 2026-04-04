import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Plus, Pencil, X } from "lucide-react";
import { apiGet, apiPost, apiPut } from "../../lib/api";
import { useToast } from "../../hooks/useToast";
import { DataTable, type Column } from "../../components/DataTable";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import type { Reason } from "../../types";

export function ReasonsTab() {
  const { addToast } = useToast();
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Reason | null>(null);

  // Form
  const [text, setText] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchReasons = useCallback(async () => {
    try {
      const data = await apiGet<Reason[]>("/reasons?all=true");
      setReasons(data);
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to load reasons"
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchReasons();
  }, [fetchReasons]);

  const openAdd = () => {
    setEditing(null);
    setText("");
    setShowForm(true);
  };

  const openEdit = (r: Reason) => {
    setEditing(r);
    setText(r.text);
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
        await apiPut(`/reasons/${editing.id}`, { text });
        addToast("success", "Reason updated");
      } else {
        await apiPost("/reasons", { text });
        addToast("success", "Reason created");
      }
      closeForm();
      fetchReasons();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to save reason"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (reason: Reason) => {
    try {
      await apiPut(`/reasons/${reason.id}`, { active: !reason.active });
      addToast(
        "success",
        `Reason ${reason.active ? "deactivated" : "activated"}`
      );
      fetchReasons();
    } catch (err) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to update reason"
      );
    }
  };

  const columns: Column<Reason>[] = [
    {
      key: "text",
      header: "Reason",
      render: (r) => <span className="text-white">{r.text}</span>,
    },
    {
      key: "active",
      header: "Active",
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleActive(r);
          }}
          className={`w-10 h-6 rounded-full transition-colors relative ${
            r.active ? "bg-primary" : "bg-white/10"
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              r.active ? "left-5" : "left-1"
            }`}
          />
        </button>
      ),
      className: "w-20",
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEdit(r);
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
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors min-h-[44px]"
        >
          <Plus size={16} />
          Add Reason
        </button>
      </div>

      <div className="bg-dark-800 border border-white/5 rounded-lg">
        <DataTable
          columns={columns}
          data={reasons}
          keyExtractor={(r) => r.id}
          emptyMessage="No reasons found"
        />
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeForm} />
          <div className="relative bg-dark-800 border border-white/10 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editing ? "Edit Reason" : "Add Reason"}
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
                <label className="block text-sm text-slate-300 mb-1">
                  Reason Text
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  autoFocus
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
    </div>
  );
}
