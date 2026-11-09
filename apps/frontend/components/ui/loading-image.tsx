"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingImageProps = ImageProps & { fallback: ReactNode };

export function LoadingImage(props: LoadingImageProps) {
  const src = typeof props.src === "string" ? props.src : "default" in props.src ? props.src.default.src : props.src.src;
  return <ImageForSource key={src} {...props} />;
}

function ImageForSource({ fallback, className, alt, ...props }: LoadingImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const checkCached = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete) setStatus(image.naturalWidth > 0 ? "loaded" : "error");
  }, []);

  if (status === "error") return fallback;
  return (
    <>
      <Image
        {...props}
        alt={alt}
        ref={checkCached}
        data-loaded={status === "loaded" ? "true" : undefined}
        aria-busy={status === "loading"}
        className={cn(className, status === "loading" && "opacity-0")}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
      {status === "loading" && (
        <>
          <Skeleton className="pointer-events-none absolute inset-0 size-full rounded-[inherit]" />
          <span role="status" className="sr-only">Loading image…</span>
        </>
      )}
    </>
  );
}
