"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { useUpload } from "@/hooks/use-upload";
import { useAuthContext } from "@/contexts/auth-context";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { useProfileData } from "./useProfileData";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** 10.10 — upload/remove avatar via the existing `/upload` storage client (6.10). */
export default function AvatarUploader() {
  const { user, refreshUser } = useAuthContext();
  // Avatar feeds the completeness meter, which reads the shared profile
  // store — re-sync it after a successful patch so the card updates live.
  const { refetch: refetchProfile } = useProfileData();
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, progress } = useUpload({
    bucket: "avatars",
    allowedTypes: ALLOWED_TYPES,
    maxSize: MAX_AVATAR_BYTES,
  });

  if (!user) return null;
  const initial = (user.name || user.username || user.email || "?").charAt(0).toUpperCase();

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const result = await upload(file);
    if (!result) {
      toast.error("تعذر رفع الصورة، تحقق من النوع والحجم.");
      return;
    }

    try {
      await apiClient.patch(apiRoutes.users.profile, { avatar: result.publicUrl });
      await Promise.all([refreshUser(), refetchProfile()]);
      toast.success("تم تحديث صورتك الشخصية");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "تم رفع الصورة لكن تعذر حفظها في ملفك.";
      toast.error(message);
    }
  }

  async function handleRemove() {
    try {
      await apiClient.patch(apiRoutes.users.profile, { avatar: null });
      await Promise.all([refreshUser(), refetchProfile()]);
      toast.success("تم حذف الصورة الشخصية");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "تعذر حذف الصورة، حاول مرة أخرى.";
      toast.error(message);
    }
  }

  return (
    <div className="relative shrink-0">
      <Avatar className="h-20 w-20">
        <AvatarImage src={user.avatar || undefined} alt={user.name || "الطالب"} />
        <AvatarFallback className="text-2xl font-bold">{initial}</AvatarFallback>
      </Avatar>

      {isUploading && (
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center text-white text-xs font-bold">
          <Loader2 className="w-5 h-5 animate-spin" />
          {progress > 0 && <span className="ms-1">{progress}%</span>}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="absolute -bottom-1 -end-1 flex gap-1">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-7 w-7 rounded-full shadow"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          aria-label="تغيير الصورة الشخصية"
        >
          <Camera className="w-3.5 h-3.5" />
        </Button>
        {user.avatar && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="h-7 w-7 rounded-full shadow"
            disabled={isUploading}
            onClick={handleRemove}
            aria-label="حذف الصورة الشخصية"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
