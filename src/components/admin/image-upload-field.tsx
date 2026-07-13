"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImagePlus, X } from "lucide-react";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * File picker that validates type (jpg/png/webp) and size (≤2MB) and returns a
 * data-URL preview. In production the onChange payload would instead be the
 * public URL returned after uploading to the `question-images` /
 * `category-images` Supabase Storage bucket.
 */
export function ImageUploadField({
  value,
  onChange,
  label = "Reference image",
}: {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Unsupported image type", {
        description: "Use a JPG, PNG or WEBP file.",
      });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image too large", {
        description: "Maximum size is 2MB.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {value ? (
        <div className="relative overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element -- data-URI preview */}
          <img
            src={value}
            alt="Preview"
            className="max-h-40 w-full bg-muted/30 object-contain"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute right-2 top-2"
            onClick={() => onChange(undefined)}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "hover:border-primary/40"
          )}
        >
          <ImagePlus className="size-6 text-muted-foreground" />
          <p className="text-sm">Drop an image, or click to browse</p>
          <p className="text-xs text-muted-foreground">JPG, PNG or WEBP · max 2MB</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
