"use client";

import { useRef } from "react";
import { Star, X, Plus, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryPhotoEntry {
  id: string;
  previewUrl: string;
  isCover: boolean;
}

interface GalleryColorBlockProps {
  colorId: string;
  colorName: string;
  colorHex: string;
  isGradient: boolean;
  gradientHex2: string | null;
  photos: GalleryPhotoEntry[];
  maxPhotos?: number;
  onPhotosAdded: (colorId: string, files: File[]) => void;
  onPhotoRemove: (photoId: string) => void;
  onPhotoSetCover: (photoId: string) => void;
}

export function GalleryColorBlock({
  colorId,
  colorName,
  colorHex,
  isGradient,
  gradientHex2,
  photos,
  maxPhotos = 7,
  onPhotosAdded,
  onPhotoRemove,
  onPhotoSetCover,
}: GalleryColorBlockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const swatchStyle =
    isGradient && gradientHex2
      ? { background: `linear-gradient(135deg, ${colorHex}, ${gradientHex2})` }
      : { background: colorHex };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full border border-border shrink-0"
          style={swatchStyle}
        />
        <span className="text-sm font-medium text-foreground">{colorName}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {photos.length}/{maxPhotos}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-xl overflow-hidden bg-muted"
          >
            <img
              src={photo.previewUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onPhotoSetCover(photo.id)}
              className={cn(
                "absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                photo.isCover
                  ? "bg-yellow-400 text-yellow-900"
                  : "bg-black/40 text-white hover:bg-black/60"
              )}
              title={photo.isCover ? "Capa atual" : "Definir como capa"}
            >
              <Star
                className="w-3 h-3"
                fill={photo.isCover ? "currentColor" : "none"}
              />
            </button>
            <button
              type="button"
              onClick={() => onPhotoRemove(photo.id)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 text-white hover:bg-black/60 flex items-center justify-center transition-colors"
              title="Remover foto"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/50 transition-colors text-muted-foreground"
          >
            {photos.length === 0 ? (
              <>
                <ImageIcon className="w-5 h-5" />
                <span className="text-[10px]">Adicionar</span>
              </>
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) onPhotosAdded(colorId, files);
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
