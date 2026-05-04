"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  containerClassName,
  priority = false,
  quality = 85,
  placeholder = "empty",
  blurDataURL,
  onLoad,
  onError,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  objectFit = "cover",
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [isInView, setIsInView] = React.useState(priority);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  React.useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "50px",
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Convert to WebP if possible (for local images)
  const optimizedSrc = React.useMemo(() => {
    if (src.startsWith("http") || src.endsWith(".webp")) {
      return src;
    }
    // Add format=webp query param for image optimization services
    if (src.includes("?")) {
      return `${src}&format=webp`;
    }
    return `${src}?format=webp`;
  }, [src]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-muted",
        fill && "w-full h-full",
        containerClassName
      )}
      style={!fill ? { width, height } : undefined}
    >
      {/* Placeholder / Loading State */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center text-muted-foreground">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">فشل تحميل الصورة</span>
          </div>
        </div>
      )}

      {/* Image */}
      {isInView && (
        <Image
          src={optimizedSrc}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          priority={priority}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          style={{ objectFit }}
        />
      )}
    </div>
  );
}

// Hook for image preloading
export function useImagePreloader() {
  const preload = React.useCallback((srcs: string[]) => {
    srcs.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  const preloadPriority = React.useCallback((src: string) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    document.head.appendChild(link);
  }, []);

  return { preload, preloadPriority };
}

// Hook for responsive images
export function useResponsiveImage(
  baseSrc: string,
  widths: number[] = [640, 768, 1024, 1280, 1536]
) {
  const srcSet = React.useMemo(() => {
    return widths
      .map((w) => `${baseSrc}?w=${w}&format=webp ${w}w`)
      .join(", ");
  }, [baseSrc, widths]);

  return {
    srcSet,
    src: `${baseSrc}?format=webp`,
    sizes: "(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw",
  };
}

// Component for avatar with fallback
interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
  fallback?: React.ReactNode;
}

export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className,
  fallback,
}: AvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-muted",
          className
        )}
        style={{ width: size, height: size }}
      >
        {fallback || (
          <span className="text-muted-foreground text-sm">
            {alt.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
      onError={() => setHasError(true)}
    />
  );
}
