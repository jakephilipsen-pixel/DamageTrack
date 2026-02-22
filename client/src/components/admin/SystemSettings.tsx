import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { getSettings, updateSettings } from '../../api/users';
import { toast } from 'sonner';

const SETTING_FIELDS = [
  {
    key: 'company_name',
    label: 'Company Name',
    description: 'Display name for your 3PL company',
    type: 'text',
  },
  {
    key: 'default_email_from',
    label: 'Default "From" Email',
    description: 'Email address used for outgoing notifications',
    type: 'email',
  },
  {
    key: 'default_email_recipients',
    label: 'Default Email Recipients',
    description: 'Comma-separated email addresses for default notifications',
    type: 'text',
  },
  {
    key: 'smtp_host',
    label: 'SMTP Host',
    description: 'Configured on the server — contact system administrator to change',
    type: 'text',
    readOnly: true,
  },
  {
    key: 'smtp_port',
    label: 'SMTP Port',
    description: 'Configured on the server — contact system administrator to change',
    type: 'text',
    readOnly: true,
  },
  {
    key: 'damage_ref_prefix',
    label: 'Reference Number Prefix',
    description: 'Prefix used for damage report reference numbers (e.g. DMG)',
    type: 'text',
  },
  {
    key: 'require_photos',
    label: 'Require Photos',
    description: 'Whether photos are required when creating a damage report (yes/no)',
    type: 'text',
  },
];

export function SystemSettings() {
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  useEffect(() => {
    if (settings) {
      setFormValues(settings);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleSave = () => {
    const editable: Record<string, string> = {};
    SETTING_FIELDS.filter((f) => !f.readOnly).forEach((f) => {
      editable[f.key] = formValues[f.key] || '';
    });
    mutation.mutate(editable);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>Configure system-wide settings for DamageTrack.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {SETTING_FIELDS.map((field) => (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id={field.key}
                type={field.type}
                value={formValues[field.key] || ''}
                onChange={(e) =>
                  !field.readOnly && setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                readOnly={field.readOnly}
                disabled={field.readOnly}
                className={field.readOnly ? 'bg-muted cursor-not-allowed' : ''}
                placeholder={field.readOnly ? 'Server-configured' : ''}
              />
              {field.readOnly && (
                <div className="flex items-center">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
          </div>
        ))}

        <div className="pt-4 border-t">
          <Button onClick={handleSave} disabled={mutation.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {mutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
