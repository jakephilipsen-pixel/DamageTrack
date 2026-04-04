import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./hooks/useToast";
import { ToastContainer } from "./components/Toast";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NewReportPage } from "./pages/NewReportPage";
import { ReportDetailPage } from "./pages/ReportDetailPage";
import { AdminPage, AdminRedirect } from "./pages/AdminPage";
import { ProductsTab } from "./pages/admin/ProductsTab";
import { EmployeesTab } from "./pages/admin/EmployeesTab";
import { ReasonsTab } from "./pages/admin/ReasonsTab";
import { ExportTab } from "./pages/admin/ExportTab";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="reports/new" element={<NewReportPage />} />
              <Route path="reports/:id" element={<ReportDetailPage />} />

              {/* Admin */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminPage />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminRedirect />} />
                <Route path="products" element={<ProductsTab />} />
                <Route path="employees" element={<EmployeesTab />} />
                <Route path="reasons" element={<ReasonsTab />} />
                <Route path="export" element={<ExportTab />} />
              </Route>
            </Route>
          </Routes>
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
