import { useState } from 'react';
import { Star, Trash2, ChevronLeft, ChevronRight, X, Edit2, Check } from 'lucide-react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { DamagePhoto } from '../../types';
import { deletePhoto, setPrimaryPhoto, updatePhotoCaption } from '../../api/damages';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface PhotoGalleryProps {
  photos: DamagePhoto[];
  damageId: string;
}

export function PhotoGallery({ photos, damageId }: PhotoGalleryProps) {
  const queryClient = useQueryClient();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionValue, setCaptionValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setEditingCaption(false);
    setCaptionValue(photos[index]?.caption || '');
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setEditingCaption(false);
  };

  const goNext = () => {
    if (lightboxIndex !== null) {
      const next = (lightboxIndex + 1) % photos.length;
      setLightboxIndex(next);
      setCaptionValue(photos[next]?.caption || '');
      setEditingCaption(false);
    }
  };

  const goPrev = () => {
    if (lightboxIndex !== null) {
      const prev = (lightboxIndex - 1 + photos.length) % photos.length;
      setLightboxIndex(prev);
      setCaptionValue(photos[prev]?.caption || '');
      setEditingCaption(false);
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    try {
      await setPrimaryPhoto(photoId);
      queryClient.invalidateQueries({ queryKey: ['damage', damageId] });
      toast.success('Primary photo updated');
    } catch {
      toast.error('Failed to update primary photo');
    }
  };

  const handleSaveCaption = async () => {
    if (lightboxIndex === null) return;
    const photo = photos[lightboxIndex];
    try {
      await updatePhotoCaption(photo.id, captionValue);
      queryClient.invalidateQueries({ queryKey: ['damage', damageId] });
      toast.success('Caption saved');
      setEditingCaption(false);
    } catch {
      toast.error('Failed to save caption');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deletePhoto(deleteTarget);
      queryClient.invalidateQueries({ queryKey: ['damage', damageId] });
      toast.success('Photo deleted');
      if (lightboxIndex !== null && lightboxIndex >= photos.length - 1) {
        setLightboxIndex(photos.length > 1 ? lightboxIndex - 1 : null);
      }
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete photo');
    } finally {
      setIsDeleting(false);
    }
  };

  if (photos.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No photos attached.</p>;
  }

  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative group rounded-lg overflow-hidden border bg-muted cursor-pointer"
            onClick={() => openLightbox(index)}
          >
            <img
              src={`/uploads/${photo.filename}`}
              alt={photo.originalName}
              className="w-full h-32 object-cover transition-transform group-hover:scale-105"
            />
            {photo.isPrimary && (
              <div className="absolute top-1.5 left-1.5 bg-yellow-400 rounded-full p-0.5">
                <Star className="h-3 w-3 text-yellow-900 fill-current" />
              </div>
            )}
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                <p className="text-xs text-white truncate">{photo.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="max-w-3xl p-0 bg-black border-0">
          {currentPhoto && (
            <div className="relative flex flex-col">
              {/* Toolbar */}
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20 h-8"
                    onClick={() => handleSetPrimary(currentPhoto.id)}
                  >
                    <Star className={`h-4 w-4 mr-1 ${currentPhoto.isPrimary ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    {currentPhoto.isPrimary ? 'Primary' : 'Set Primary'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20 h-8"
                    onClick={() => { setDeleteTarget(currentPhoto.id); }}
                  >
                    <Trash2 className="h-4 w-4 mr-1 text-red-400" />
                    Delete
                  </Button>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 w-8"
                  onClick={closeLightbox}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Image */}
              <div className="relative flex items-center justify-center min-h-[400px] bg-black">
                <img
                  src={`/uploads/${currentPhoto.filename}`}
                  alt={currentPhoto.originalName}
                  className="max-w-full max-h-[60vh] object-contain"
                />

                {photos.length > 1 && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute left-2 text-white hover:bg-white/20"
                      onClick={goPrev}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 text-white hover:bg-white/20"
                      onClick={goNext}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
              </div>

              {/* Caption area */}
              <div className="bg-gray-900 p-3 flex items-center gap-2">
                {editingCaption ? (
                  <>
                    <Input
                      value={captionValue}
                      onChange={(e) => setCaptionValue(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white h-8 text-sm flex-1"
                      placeholder="Add a caption..."
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCaption(); }}
                      autoFocus
                    />
                    <Button size="sm" onClick={handleSaveCaption} className="h-8">
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCaption(false)} className="h-8 text-gray-400">
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-300 flex-1">
                      {currentPhoto.caption || <span className="text-gray-500 italic">No caption</span>}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white h-8"
                      onClick={() => { setEditingCaption(true); setCaptionValue(currentPhoto.caption || ''); }}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </>
                )}
              </div>

              <div className="bg-gray-900 pb-2 text-center">
                <p className="text-xs text-gray-500">
                  {lightboxIndex !== null ? lightboxIndex + 1 : 0} / {photos.length} — {currentPhoto.originalName}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
