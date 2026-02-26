import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Warehouse, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { useAuth } from '../hooks/useAuth';
import { useBranding } from '../contexts/BrandingContext';
import { changePassword } from '../api/auth';
import { loginSchema, changePasswordSchema } from '../utils/validators';
import { toast } from 'sonner';

type LoginForm = z.infer<typeof loginSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user, refreshUser } = useAuth();
  const { branding } = useBranding();
  const [loginError, setLoginError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerPwd,
    handleSubmit: handlePwdSubmit,
    formState: { errors: pwdErrors },
    reset: resetPwd,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    document.title = `${branding.companyName} — Login`;
  }, [branding.companyName]);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.mustChangePassword) {
        setShowChangePassword(true);
      } else {
        navigate(user?.role === 'WAREHOUSE_USER' ? '/damages' : '/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (data: LoginForm) => {
    setLoginError('');
    try {
      await login(data.username, data.password);
    } catch (err: any) {
      setLoginError(err.response?.data?.error || 'Invalid username or password');
    }
  };

  const onChangePassword = async (data: ChangePasswordForm) => {
    setIsChanging(true);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      await refreshUser();
      toast.success('Password changed successfully.');
      setShowChangePassword(false);
      resetPwd();
    } catch (err: any) {
      const detail = err.response?.data?.details?.[0]?.message;
      toast.error(detail || err.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(to bottom right, ${branding.secondaryColor}, ${branding.secondaryColor}dd)` }}
    >
      <div className="w-full max-w-md">
        {/* Logo / Company Name */}
        <div className="text-center mb-8">
          {branding.logoUrl ? (
            <div className="flex justify-center mb-4">
              <img
                src={branding.logoUrl}
                alt={branding.companyName}
                className="max-h-20 w-auto drop-shadow-lg"
              />
            </div>
          ) : (
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <Warehouse className="h-8 w-8 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-white">{branding.companyName}</h1>
          {branding.tagline && (
            <p className="text-slate-400 mt-1">{branding.tagline}</p>
          )}
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="pb-4">
            <h2 className="text-xl font-semibold text-center">Sign In</h2>
            <p className="text-sm text-muted-foreground text-center">Enter your credentials to access the system</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  {...register('username')}
                  className="mt-1"
                  placeholder="Enter your username"
                />
                {errors.username && (
                  <p className="text-sm text-destructive mt-1">{errors.username.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  className="mt-1"
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>

              {loginError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {loginError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                style={{ backgroundColor: branding.primaryColor }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-xs mt-4">
          {branding.companyName} v1.0 — Contact your administrator if you need access.
        </p>
      </div>

      {/* Force Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Your Password</DialogTitle>
            <DialogDescription>
              Your account requires a password change before you can continue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePwdSubmit(onChangePassword)} className="space-y-4">
            <div>
              <Label>Current Password</Label>
              <Input type="password" {...registerPwd('currentPassword')} className="mt-1" />
              {pwdErrors.currentPassword && (
                <p className="text-xs text-destructive mt-1">{pwdErrors.currentPassword.message}</p>
              )}
            </div>
            <div>
              <Label>New Password</Label>
              <Input type="password" {...registerPwd('newPassword')} className="mt-1" />
              {pwdErrors.newPassword ? (
                <p className="text-xs text-destructive mt-1">{pwdErrors.newPassword.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Min 8 chars · uppercase · lowercase · number
                </p>
              )}
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input type="password" {...registerPwd('confirmPassword')} className="mt-1" />
              {pwdErrors.confirmPassword && (
                <p className="text-xs text-destructive mt-1">{pwdErrors.confirmPassword.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={isChanging}>
                {isChanging ? 'Changing...' : 'Set New Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
