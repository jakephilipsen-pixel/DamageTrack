import { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { UserManagement } from '../components/admin/UserManagement';
import { UserForm } from '../components/admin/UserForm';
import { CsvImportDialog } from '../components/ui/CsvImportDialog';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [showAddUser, setShowAddUser] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="text-sm text-muted-foreground">Manage system users and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => setShowAddUser(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <UserManagement />

      <UserForm open={showAddUser} onClose={() => setShowAddUser(false)} />

      <CsvImportDialog
        entity="users"
        open={showImport}
        onOpenChange={setShowImport}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />
    </div>
  );
}
