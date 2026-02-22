import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { User, Role } from '../../types';
import { createUser, updateUser } from '../../api/users';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const createSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'WAREHOUSE_USER'] as const),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const editSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'WAREHOUSE_USER'] as const),
  password: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  user?: User;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'WAREHOUSE_USER', label: 'Warehouse Staff' },
];

export function UserForm({ open, onClose, user }: UserFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm | EditForm>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
        password: '',
      });
    } else {
      reset({ firstName: '', lastName: '', email: '', username: '', role: 'WAREHOUSE_USER', password: '' });
    }
  }, [user, reset, open]);

  const onSubmit = async (data: CreateForm | EditForm) => {
    try {
      if (isEdit && user) {
        const payload = { ...data } as any;
        if (!payload.password) delete payload.password;
        await updateUser(user.id, payload);
        toast.success('User updated');
      } else {
        await createUser(data as CreateForm);
        toast.success('User created');
      }
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save user');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Add New User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" {...register('firstName')} className="mt-1" />
              {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register('lastName')} className="mt-1" />
              {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register('email')} className="mt-1" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="username">Username *</Label>
            <Input id="username" {...register('username')} className="mt-1" />
            {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
          </div>

          <div>
            <Label>Role *</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && <p className="text-xs text-destructive mt-1">{errors.role.message}</p>}
          </div>

          <div>
            <Label htmlFor="password">
              Password {isEdit ? '(leave blank to keep current)' : '*'}
            </Label>
            <Input id="password" type="password" {...register('password')} className="mt-1" />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
