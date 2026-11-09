"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { toast } from "@/components/ui/toast";
import { LoadingImage } from "@/components/ui/loading-image";

async function preparePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose JPG, PNG or WebP images.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Each photo must be under 5 MB.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`Unable to read ${file.name}. Try another image.`);
  });
  try {
    const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare this photo.");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const photo = canvas.toDataURL("image/jpeg", 0.75);
    if (photo.length > 400_000)
      throw new Error("This photo is too detailed. Try a smaller image.");
    return photo;
  } finally {
    bitmap.close();
  }
}

export default function ProfilePhotos({
  photos,
  onChange,
  disabled,
  onBusyChange,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (photos.length + files.length > 6) {
      toast.add({
        title: "You can add up to 6 photos",
        description: "Remove one to make room.",
        type: "error",
      });
      return;
    }
    setBusy(true);
    onBusyChange(true);
    const uploadToast = toast.add({
      title: "Preparing photos…",
      type: "loading",
      timeout: 0,
    });
    try {
      const next: string[] = [];
      for (const file of files) next.push(await preparePhoto(file));
      onChange([...photos, ...next]);
      toast.update(uploadToast, {
        title: "Photos ready",
        description: "Save your profile to keep these changes.",
        type: "success",
        timeout: 5000,
      });
    } catch (cause) {
      toast.update(uploadToast, {
        title: "Unable to add photos",
        description:
          cause instanceof Error ? cause.message : "Please try again.",
        type: "error",
        timeout: 5000,
      });
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Your photos</CardTitle>
          <Badge variant="secondary">{photos.length} / 6</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        {photos.length ? (
          <Carousel aria-label="Your profile photos" opts={{ align: "start" }}>
            <CarouselContent>
              {photos.map((photo, index) => (
                <CarouselItem
                  key={photo + index}
                  aria-label={`Photo ${index + 1} of ${photos.length}`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
                    {/* Uploaded data URLs are already resized; they do not need the image optimizer. */}
                    <LoadingImage
                      src={photo}
                      width={960}
                      height={1200}
                      unoptimized
                      fallback={<div role="img" aria-label="Photo unavailable" className="flex size-full items-center justify-center"><Camera className="size-16" /></div>}
                      alt={`Your profile photo ${index + 1}`}
                      className="aspect-[4/5] w-full object-cover"
                    />
                    {index === 0 && (
                      <Badge className="absolute left-3 top-3">
                        <Star /> Cover photo
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled || busy || index === 0}
                      onClick={() =>
                        onChange([
                          photo,
                          ...photos.filter((_, i) => i !== index),
                        ])
                      }
                    >
                      <Star data-icon="inline-start" />
                      {index === 0 ? "Cover photo" : "Make cover"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove photo ${index + 1}`}
                      disabled={disabled || busy}
                      onClick={() =>
                        onChange(photos.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-3 flex items-center justify-end gap-3 border-t pt-4">
              <div className="flex gap-2">
                <CarouselPrevious
                  type="button"
                  className="static translate-none"
                />
                <CarouselNext type="button" className="static translate-none" />
              </div>
            </div>
          </Carousel>
        ) : (
          <Empty className="aspect-[4/5] border bg-muted/40 px-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Camera />
              </EmptyMedia>
              <EmptyTitle>Put a face to your name</EmptyTitle>
            </EmptyHeader>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || busy}
              onClick={() => input.current?.click()}
            >
              <ImagePlus data-icon="inline-start" />
              Add your first photo
            </Button>
          </Empty>
        )}
        <input
          ref={input}
          id="profile-photos"
          aria-label="Upload profile photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          tabIndex={-1}
          disabled={disabled || busy || photos.length >= 6}
          onChange={upload}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled || busy || photos.length >= 6}
          onClick={() => input.current?.click()}
        >
          <Upload data-icon="inline-start" />
          {busy ? "Preparing photos…" : "Upload photos"}
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          JPG, PNG or WebP · Up to 5 MB each.
          <br />
          Photos are saved when you save your profile.
        </p>
      </CardContent>
    </Card>
  );
}
