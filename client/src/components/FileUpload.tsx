import { useRef, useState, useCallback } from "react";
import { Camera, X, ImagePlus } from "lucide-react";

interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
}

export function FileUpload({
  files,
  onChange,
  maxFiles = 10,
  accept = "image/jpeg,image/png,image/webp,image/heic,image/heif",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const previews = files.map((f) => ({
    file: f,
    url: URL.createObjectURL(f),
  }));

  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const arr = Array.from(incoming);
      const total = files.length + arr.length;
      const allowed = arr.slice(0, maxFiles - files.length);
      if (total > maxFiles) {
        // silently cap at max
      }
      onChange([...files, ...allowed]);
    },
    [files, maxFiles, onChange]
  );

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          {files.length === 0 ? (
            <>
              <Camera size={32} className="text-slate-400" />
              <p className="text-sm text-slate-400">
                Tap to take photos or drag & drop images
              </p>
              <p className="text-xs text-slate-500">
                JPEG, PNG, WebP - up to {maxFiles} photos
              </p>
            </>
          ) : (
            <>
              <ImagePlus size={24} className="text-slate-400" />
              <p className="text-sm text-slate-400">
                {files.length} photo{files.length !== 1 ? "s" : ""} selected
                {files.length < maxFiles && " - tap to add more"}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          {previews.map((p, i) => (
            <div key={i} className="relative group aspect-square">
              <img
                src={p.url}
                alt={`Preview ${i + 1}`}
                className="w-full h-full object-cover rounded-md"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
