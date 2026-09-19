import { useEffect, useState } from "react";
import { fetchThumbnailVtt } from "@/services/api/lesson-content-service";
import { parseThumbnailVtt } from "../utils";

export function useThumbnailCues(thumbnailVttUrl?: string) {
  const [thumbnailCues, setThumbnailCues] = useState<ReturnType<typeof parseThumbnailVtt>>([]);

  useEffect(() => {
    if (!thumbnailVttUrl) return;

    let cancelled = false;
    fetchThumbnailVtt(thumbnailVttUrl)
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
