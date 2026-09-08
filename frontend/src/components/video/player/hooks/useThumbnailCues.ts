import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/api-client";
import { parseThumbnailVtt } from "../utils";

export function useThumbnailCues(thumbnailVttUrl?: string) {
  const [thumbnailCues, setThumbnailCues] = useState<ReturnType<typeof parseThumbnailVtt>>([]);

  useEffect(() => {
    if (!thumbnailVttUrl) return;

    let cancelled = false;
    apiClient.fetch(thumbnailVttUrl, { cache: "force-cache" })
      .then((response) => response.ok ? response.text() : "")
      .then((text) => {
        if (!cancelled) setThumbnailCues(text ? parseThumbnailVtt(text, thumbnailVttUrl) : []);
      })
      .catch(() => {
        if (!cancelled) setThumbnailCues([]);
      });

    return () => {
      cancelled = true;
    };
  }, [thumbnailVttUrl]);

  return thumbnailVttUrl ? thumbnailCues : [];
}
