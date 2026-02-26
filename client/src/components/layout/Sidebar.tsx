import { NavLink, useNavigate } from 'react-router-dom';
import React from 'react';
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
  MapPin,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useBranding } from '../../contexts/BrandingContext';
import { Button } from '../ui/button';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelWarehouse?: string;
  roles: string[];
}

interface SidebarProps {
  onNavClick?: () => void;
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'MANAGER'] },
  { to: '/damages', icon: AlertTriangle, label: 'Damage Reports', labelWarehouse: 'My Reports', roles: ['ADMIN', 'MANAGER', 'WAREHOUSE_USER'] },
  { to: '/customers', icon: Building2, label: 'Customers', roles: ['ADMIN', 'MANAGER'] },
  { to: '/products', icon: Package, label: 'Products', roles: ['ADMIN', 'MANAGER'] },
  { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['ADMIN', 'MANAGER'] },
];

const adminItems = [
  { to: '/admin/users', icon: Users, label: 'Users', roles: ['ADMIN'] },
  { to: '/admin/warehouse-locations', icon: MapPin, label: 'Locations', roles: ['ADMIN'] },
  { to: '/admin/branding', icon: Palette, label: 'Branding', roles: ['ADMIN'] },
  { to: '/admin/settings', icon: Settings, label: 'Settings', roles: ['ADMIN'] },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  WAREHOUSE_USER: 'Warehouse Staff',
};

export function Sidebar({ onNavClick }: SidebarProps) {
  const { user, logout } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleNav = navItems.filter(item => user && item.roles.includes(user.role));
  const visibleAdmin = adminItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div
      className="flex flex-col h-full text-sidebar-foreground"
      style={{ backgroundColor: branding.secondaryColor }}
    >
      {/* Logo / Company Name */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        {branding.logoMediumUrl ? (
          <img
            src={branding.logoMediumUrl}
            alt={branding.companyName}
            className="max-w-[160px] max-h-10 w-auto"
          />
        ) : (
          <>
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <Warehouse className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg leading-none text-white">{branding.companyName}</div>
            </div>
          </>
        )}
        {!branding.logoMediumUrl && branding.tagline && (
          <div className="hidden" /> // tagline shown below for non-logo
        )}
      </div>
      {branding.tagline && (
        <div className="px-6 pt-1 pb-0">
          <p className="text-xs text-white/50">{branding.tagline}</p>
        </div>
      )}

      {/* New Report Button */}
      <div className="px-4 py-3">
        <Button
          className="w-full text-white gap-2"
          style={{ backgroundColor: branding.primaryColor }}
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
                  ? 'text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: branding.primaryColor } : {}
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {user?.role === 'WAREHOUSE_USER' && item.labelWarehouse ? item.labelWarehouse : item.label}
          </NavLink>
        ))}

        {visibleAdmin.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Admin</p>
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
                      ? 'text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  )
                }
                style={({ isActive }) =>
                  isActive ? { backgroundColor: branding.primaryColor } : {}
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
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
            style={{ backgroundColor: `${branding.primaryColor}50` }}
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-white/50 truncate">{user?.role ? ROLE_LABELS[user.role] : ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
