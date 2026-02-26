import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, User, KeyRound, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { NotificationBell } from './NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '../../hooks/useAuth';
import { changePassword } from '../../api/auth';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema } from '../../utils/validators';
import { z } from 'zod';

interface HeaderProps {
  onMenuClick: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/damages': 'Damage Reports',
  '/damages/new': 'New Damage Report',
  '/customers': 'Customers',
  '/products': 'Products',
  '/reports': 'Reports',
  '/admin/users': 'User Management',
  '/admin/branding': 'Branding Settings',
  '/admin/settings': 'System Settings',
};

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const pageTitle = PAGE_TITLES[location.pathname] || 'DamageTrack';

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const onChangePassword = async (data: ChangePasswordForm) => {
    setIsChanging(true);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      toast.success('Password changed successfully');
      setShowChangePassword(false);
      reset();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <>
      <header className="h-16 border-b bg-background flex items-center px-4 gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        <div className="flex-1">
          <h1 className="font-semibold text-lg">{pageTitle}</h1>
        </div>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                {...register('currentPassword')}
                className="mt-1"
              />
              {errors.currentPassword && (
                <p className="text-sm text-destructive mt-1">{errors.currentPassword.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                {...register('newPassword')}
                className="mt-1"
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive mt-1">{errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                className="mt-1"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowChangePassword(false); reset(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isChanging}>
                {isChanging ? 'Changing...' : 'Change Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
