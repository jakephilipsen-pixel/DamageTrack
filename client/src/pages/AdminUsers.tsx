import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { UserManagement } from '../components/admin/UserManagement';
import { UserForm } from '../components/admin/UserForm';

export default function AdminUsers() {
  const [showAddUser, setShowAddUser] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="text-sm text-muted-foreground">Manage system users and permissions</p>
        </div>
        <Button onClick={() => setShowAddUser(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <UserManagement />

      <UserForm open={showAddUser} onClose={() => setShowAddUser(false)} />
    </div>
  );
}
