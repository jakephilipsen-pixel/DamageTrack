import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Upload, Trash2, RotateCcw, Palette, Building2, Image } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { useBranding } from '../contexts/BrandingContext';
import apiClient from '../api/client';

const DEFAULT_COLORS = {
  primaryColor: '#3b82f6',
  secondaryColor: '#1e293b',
  accentColor: '#10b981',
};

const hexRegex = /^#[0-9a-fA-F]{6}$/;

export default function AdminBranding() {
  const { branding, refetch } = useBranding();
  const [companyName, setCompanyName] = useState('');
  const [tagline, setTagline] = useState('');
  const [pdfFooterText, setPdfFooterText] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLORS.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_COLORS.secondaryColor);
  const [accentColor, setAccentColor] = useState(DEFAULT_COLORS.accentColor);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load current values
  useEffect(() => {
    setCompanyName(branding.companyName);
    setTagline(branding.tagline || '');
    setPdfFooterText(branding.pdfFooterText || '');
    setEmailFromName(branding.emailFromName || '');
    setPrimaryColor(branding.primaryColor);
    setSecondaryColor(branding.secondaryColor);
    setAccentColor(branding.accentColor);
  }, [branding]);

  useEffect(() => {
    document.title = `${branding.companyName} — Branding Settings`;
  }, [branding.companyName]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!companyName.trim()) newErrors.companyName = 'Company name is required';
    if (companyName.length > 100) newErrors.companyName = 'Max 100 characters';
    if (tagline.length > 200) newErrors.tagline = 'Max 200 characters';
    if (pdfFooterText.length > 300) newErrors.pdfFooterText = 'Max 300 characters';
    if (!hexRegex.test(primaryColor)) newErrors.primaryColor = 'Invalid hex colour';
    if (!hexRegex.test(secondaryColor)) newErrors.secondaryColor = 'Invalid hex colour';
    if (!hexRegex.test(accentColor)) newErrors.accentColor = 'Invalid hex colour';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await apiClient.put('/branding', {
        companyName: companyName.trim(),
        tagline: tagline.trim() || null,
        primaryColor,
        secondaryColor,
        accentColor,
        pdfFooterText: pdfFooterText.trim() || null,
        emailFromName: emailFromName.trim() || null,
      });
      await refetch();
      toast.success('Branding settings saved');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to save branding settings';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 2MB.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      await apiClient.post('/branding/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refetch();
      toast.success('Logo uploaded successfully');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to upload logo';
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  }, [refetch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/svg+xml': ['.svg'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleDeleteLogo = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete('/branding/logo');
      await refetch();
      toast.success('Logo deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete logo');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetColors = () => {
    setPrimaryColor(DEFAULT_COLORS.primaryColor);
    setSecondaryColor(DEFAULT_COLORS.secondaryColor);
    setAccentColor(DEFAULT_COLORS.accentColor);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-semibold">Branding Settings</h2>
        <p className="text-sm text-muted-foreground">
          Customise the appearance of the login screen, sidebar, PDF reports, and emails
        </p>
      </div>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4" />
            Company Logo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {branding.logoUrl ? (
            <div className="flex items-center gap-4">
              <div className="border rounded-lg p-4 bg-muted/30">
                <img
                  src={`${branding.logoUrl}?t=${Date.now()}`}
                  alt="Current logo"
                  className="max-h-20 w-auto"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Current logo</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      {isDeleting ? 'Deleting...' : 'Delete Logo'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Logo</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete the company logo? The app will revert to text-based branding.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteLogo}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No logo uploaded. The company name will be shown as text.</p>
          )}

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {isUploading ? (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            ) : isDragActive ? (
              <p className="text-sm text-primary">Drop the file here</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Drag and drop a logo here, or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPEG, SVG or WebP — max 2MB
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Company Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 max-w-md"
              maxLength={100}
            />
            {errors.companyName && <p className="text-xs text-destructive mt-1">{errors.companyName}</p>}
          </div>
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="mt-1 max-w-md"
              placeholder="Warehouse Damage Management"
              maxLength={200}
            />
            {errors.tagline && <p className="text-xs text-destructive mt-1">{errors.tagline}</p>}
          </div>
          <div>
            <Label htmlFor="pdfFooterText">PDF Footer Text</Label>
            <Input
              id="pdfFooterText"
              value={pdfFooterText}
              onChange={(e) => setPdfFooterText(e.target.value)}
              className="mt-1 max-w-md"
              placeholder="Your Company Pty Ltd — ABN 12 345 678 901"
              maxLength={300}
            />
            {errors.pdfFooterText && <p className="text-xs text-destructive mt-1">{errors.pdfFooterText}</p>}
          </div>
          <div>
            <Label htmlFor="emailFromName">Email From Name</Label>
            <Input
              id="emailFromName"
              value={emailFromName}
              onChange={(e) => setEmailFromName(e.target.value)}
              className="mt-1 max-w-md"
              placeholder="Go Cold Warehouse"
              maxLength={100}
            />
          </div>
        </CardContent>
      </Card>

      {/* Brand Colours */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Brand Colours
            </CardTitle>
            <Button variant="outline" size="sm" onClick={resetColors}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset to Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ColorInput
              label="Primary Colour"
              description="Buttons, links, active states"
              value={primaryColor}
              onChange={setPrimaryColor}
              error={errors.primaryColor}
            />
            <ColorInput
              label="Secondary Colour"
              description="Sidebar, headers"
              value={secondaryColor}
              onChange={setSecondaryColor}
              error={errors.secondaryColor}
            />
            <ColorInput
              label="Accent Colour"
              description="Success states"
              value={accentColor}
              onChange={setAccentColor}
              error={errors.accentColor}
            />
          </div>

          {/* Colour preview */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="flex gap-2 h-10">
              <div className="flex-1 rounded-md" style={{ backgroundColor: primaryColor }} title="Primary" />
              <div className="flex-1 rounded-md" style={{ backgroundColor: secondaryColor }} title="Secondary" />
              <div className="flex-1 rounded-md" style={{ backgroundColor: accentColor }} title="Accent" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

function ColorInput({
  label,
  description,
  value,
  onChange,
  error,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <p className="text-xs text-muted-foreground mb-1">{description}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded border cursor-pointer p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
          maxLength={7}
          placeholder="#000000"
        />
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
