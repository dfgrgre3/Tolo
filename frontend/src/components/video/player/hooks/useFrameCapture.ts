import { useCallback, type MutableRefObject } from "react";
import { Camera } from "lucide-react";
import type { PlayerFeedback } from "../types";

type FrameCaptureOptions = {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  provider: string;
  flashFeedback: (feedback: NonNullable<PlayerFeedback>) => void;
  lessonTitle: string;
};

export function useFrameCapture({
  videoRef,
  provider,
  flashFeedback,
  lessonTitle,
}: FrameCaptureOptions) {
  return useCallback(() => {
    if (provider === "youtube" || !videoRef.current) {
      flashFeedback({
        icon: Camera,
        label: "التقاط الشاشة غير مدعوم لـ YouTube حالياً",
      });
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `thanawy-${lessonTitle}-${timestamp}.png`;
      link.href = dataUrl;
      link.click();

      flashFeedback({
        icon: Camera,
        label: "تم التقاط لقطة الشاشة وحفظها",
      });
    } catch (err) {
      console.error("Screenshot failed", err);
      flashFeedback({
        icon: Camera,
        label: "فشل التقاط الشاشة",
      });
    }
  }, [flashFeedback, lessonTitle, provider, videoRef]);
}
