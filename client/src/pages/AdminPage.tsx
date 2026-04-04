import { NavLink, Outlet, Navigate } from "react-router-dom";
import { Package, Users, MessageSquare, Download } from "lucide-react";
import { cn } from "../lib/utils";

const tabs = [
  { to: "/admin/products", icon: Package, label: "Products" },
  { to: "/admin/employees", icon: Users, label: "Employees" },
  { to: "/admin/reasons", icon: MessageSquare, label: "Reasons" },
  { to: "/admin/export", icon: Download, label: "Export" },
];

export function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 mb-6 bg-dark-800 rounded-lg p-1 border border-white/5">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors min-h-[44px]",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )
            }
          >
            <tab.icon size={16} />
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}

/** Redirect /admin to /admin/products */
export function AdminRedirect() {
  return <Navigate to="/admin/products" replace />;
}
