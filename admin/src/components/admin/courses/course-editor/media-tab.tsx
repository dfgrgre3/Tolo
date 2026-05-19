"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";

import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminUpload } from "@/components/admin/ui/admin-upload";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";

import type { CourseFormValues, UploadedVideoMetadata } from "./types";
import {
  Label,
  ThumbnailPreview,
  TrailerPreview,
  TrailerMetaInfo,
} from "./shared-components";

interface MediaTabProps {
  control: Control<CourseFormValues>;
  watch: UseFormWatch<CourseFormValues>;
  setValue: UseFormSetValue<CourseFormValues>;
  trailerUrl?: string | null;
  isDirectVideo: boolean;
  youtubeEmbedUrl?: string | null;
  uploadedTrailerMeta: UploadedVideoMetadata | null;
  setUploadedTrailerMeta: React.Dispatch<React.SetStateAction<UploadedVideoMetadata | null>>;
  trailerDurationMinutes?: number | null;
  onNext: () => void;
  onPrev: () => void;
}

export function MediaTab({
  control,
  watch,
  setValue,
  trailerUrl,
  isDirectVideo,
  youtubeEmbedUrl,
  uploadedTrailerMeta,
  setUploadedTrailerMeta,
  trailerDurationMinutes,
  onNext,
  onPrev,
}: MediaTabProps) {
  return (
    <TabsContent value="media" className="mt-0 space-y-6">
      <AdminCard className="p-6">
        <div className="grid gap-6">
          <div className="flex items-center gap-3 pb-2 border-b">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-black">
              غلاف الدورة والمعاينة
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="font-black">
                الصورة المصغرة (Thumbnail)
              </Label>
              <div className="relative aspect-video rounded-3xl overflow-hidden border border-dashed border-border/60 bg-muted/40 group">
                <ThumbnailPreview url={watch("thumbnailUrl")} />
              </div>
              <FormField
                control={control}
                name="thumbnailUrl"
                render={({ field }) => (
                  <AdminUpload
                    onUploadComplete={field.onChange}
                    label="رفع صورة الغلاف"
                    accept="image/*"
                  />
                )}
              />
            </div>

            <div className="space-y-4">
              <Label className="font-black">
                فيديو المقدمة (Trailer URL)
              </Label>
              <div className="relative aspect-video rounded-3xl overflow-hidden border border-dashed border-border/60 bg-muted/40 group">
                <TrailerPreview
                  trailerUrl={trailerUrl}
                  isDirectVideo={isDirectVideo}
                  youtubeEmbedUrl={youtubeEmbedUrl}
                />
              </div>
              <FormField
                control={control}
                name="trailerUrl"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="https://youtube.com/watch?v=..."
                        className="h-12 rounded-xl"
                      />
                    </FormControl>

                    <AdminUpload
                      accept="video/*"
                      label="رفع فيديو المقدمة من الكمبيوتر"
                      maxSize={100 * 1024} // 100GB support
                      onUploadComplete={(url, metadata) => {
                        field.onChange(url);
                        setUploadedTrailerMeta(metadata || null);
                        setValue(
                          "trailerDurationMinutes",
                          metadata?.durationMinutes || 0,
                        );
                      }}
                    />

                    <TrailerMetaInfo
                      durationMinutes={uploadedTrailerMeta?.durationMinutes || trailerDurationMinutes}
                      fileName={uploadedTrailerMeta?.fileName}
                    />

                    <FormDescription>
                      يمكنك كتابة رابط خارجي أو رفع فيديو مباشر من الكمبيوتر، وسيتم حفظ مدة الفيديو تلقائياً عند توفرها.
                    </FormDescription>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </AdminCard>

      <div className="flex justify-between">
        <AdminButton
          type="button"
          variant="outline"
          onClick={onPrev}
          className="h-12 rounded-xl px-8 font-black gap-3"
        >
          <ChevronRight className="h-4 w-4" />
          السابق
        </AdminButton>
        <AdminButton
          type="button"
          variant="outline"
          onClick={onNext}
          className="h-12 rounded-xl px-8 font-black gap-3"
        >
          التالي: تهيئة محركات البحث (SEO)
          <ChevronLeft className="h-4 w-4" />
        </AdminButton>
      </div>
    </TabsContent>
  );
}
