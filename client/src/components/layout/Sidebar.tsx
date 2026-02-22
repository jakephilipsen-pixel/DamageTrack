import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Plus,
  Building2,
  Package,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Warehouse,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';

interface SidebarProps {
  onNavClick?: () => void;
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'MANAGER', 'WAREHOUSE_USER'] },
  { to: '/damages', icon: AlertTriangle, label: 'Damage Reports', roles: ['ADMIN', 'MANAGER', 'WAREHOUSE_USER'] },
  { to: '/customers', icon: Building2, label: 'Customers', roles: ['ADMIN', 'MANAGER', 'WAREHOUSE_USER'] },
  { to: '/products', icon: Package, label: 'Products', roles: ['ADMIN', 'MANAGER', 'WAREHOUSE_USER'] },
  { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['ADMIN', 'MANAGER'] },
];

const adminItems = [
  { to: '/admin/users', icon: Users, label: 'Users', roles: ['ADMIN'] },
  { to: '/admin/settings', icon: Settings, label: 'Settings', roles: ['ADMIN'] },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  WAREHOUSE_USER: 'Warehouse Staff',
};

export function Sidebar({ onNavClick }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleNav = navItems.filter(item => user && item.roles.includes(user.role));
  const visibleAdmin = adminItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
          <Warehouse className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-lg leading-none">DamageTrack</div>
          <div className="text-xs text-sidebar-foreground/60 mt-0.5">3PL Damage Management</div>
        </div>
      </div>

      {/* New Report Button */}
      <div className="px-4 py-3">
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-white gap-2"
          onClick={() => {
            navigate('/damages/new');
            onNavClick?.();
          }}
        >
          <Plus className="w-4 h-4" />
          New Report
        </Button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavClick}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-white'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}

        {visibleAdmin.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">Admin</p>
            </div>
            {visibleAdmin.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-white'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-sm font-semibold text-white shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.role ? ROLE_LABELS[user.role] : ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
