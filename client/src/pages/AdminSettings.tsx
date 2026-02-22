import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { SystemSettings } from '../components/admin/SystemSettings';
import { AuditLog } from '../components/admin/AuditLog';

export default function AdminSettings() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">System Settings</h2>
        <p className="text-sm text-muted-foreground">Configure the system and view audit activity</p>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <SystemSettings />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
