"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

export function ProductImageUpload({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setError(
        formatSupabaseError(
          uploadError,
          "Upload failed. Ensure the product-images bucket exists and you have permission."
        )
      );
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(path);

    onChange(publicUrl);
    setUploading(false);
  };

  return (
    <div className="space-y-3">
      <Label>Product Image</Label>

      {value && (
        <div className="w-32 h-32 rounded-md border overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Product" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="space-y-2">
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFile}
          disabled={uploading}
        />
        <p className="text-xs text-muted-foreground">
          Or paste an image URL below. Upload requires the{" "}
          <code className="bg-muted px-1 rounded">product-images</code> storage
          bucket (run migration 005).
        </p>
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... or uploaded URL"
        />
      </div>

      {uploading && (
        <p className="text-sm text-muted-foreground">Uploading…</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange("")}
        >
          Clear image
        </Button>
      )}
    </div>
  );
}
