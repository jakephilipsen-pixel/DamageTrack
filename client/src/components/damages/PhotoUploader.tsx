import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { formatFileSize } from '../../utils/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PhotoUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}

export function PhotoUploader({ files, onChange, maxFiles = 10 }: PhotoUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ errors }) => {
        errors.forEach((error: any) => {
          if (error.code === 'file-too-large') toast.error('File too large. Max 10MB per file.');
          else if (error.code === 'file-invalid-type') toast.error('Invalid file type. Only images allowed.');
          else if (error.code === 'too-many-files') toast.error(`Max ${maxFiles} files allowed.`);
        });
      });
    }
    const remaining = maxFiles - files.length;
    const toAdd = acceptedFiles.slice(0, remaining);
    if (toAdd.length < acceptedFiles.length) {
      toast.warning(`Only ${remaining} more file(s) can be added.`);
    }
    if (toAdd.length > 0) {
      onChange([...files, ...toAdd]);
    }
  }, [files, onChange, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 10 * 1024 * 1024,
    maxFiles,
  });

  const removeFile = (index: number) => {
    const updated = [...files];
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop photos here' : 'Drag & drop photos here'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or click to browse — JPEG, PNG, WebP up to 10MB each ({files.length}/{maxFiles})
        </p>
        {/* Mobile camera capture */}
        <label className="mt-3 inline-flex items-center gap-2 text-xs text-primary cursor-pointer">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            multiple
            onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              const remaining = maxFiles - files.length;
              onChange([...files, ...selected.slice(0, remaining)]);
              e.target.value = '';
            }}
          />
          <ImageIcon className="h-4 w-4" />
          Use Camera
        </label>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map((file, index) => (
            <div key={index} className="relative group rounded-lg overflow-hidden border bg-muted">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-24 object-cover"
              />
              <div className="p-1.5">
                <p className="text-xs truncate text-muted-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
