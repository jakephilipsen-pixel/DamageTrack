import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleGuard } from './components/auth/RoleGuard';
import { MainLayout } from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DamageList from './pages/DamageList';
import DamageNew from './pages/DamageNew';
import DamageView from './pages/DamageView';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Reports from './pages/Reports';
import AdminUsers from './pages/AdminUsers';
import AdminSettings from './pages/AdminSettings';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/damages" element={<DamageList />} />
              <Route path="/damages/new" element={<DamageNew />} />
              <Route path="/damages/:id" element={<DamageView />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/products" element={<Products />} />
              <Route path="/reports" element={<RoleGuard roles={['ADMIN', 'MANAGER']}><Reports /></RoleGuard>} />
              <Route path="/admin/users" element={<RoleGuard roles={['ADMIN']}><AdminUsers /></RoleGuard>} />
              <Route path="/admin/settings" element={<RoleGuard roles={['ADMIN']}><AdminSettings /></RoleGuard>} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
