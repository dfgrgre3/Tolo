import { NextRequest, NextResponse } from "next/server";
import { withAdmin, handleApiError, successResponse, badRequestResponse } from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { sendMultiChannelNotification } from "@/services/notification-sender";

interface BulkMessageRequest {
  userIds: string[];
  title: string;
  message: string;
  type?: "success" | "error" | "info" | "warning";
  channels?: ('app' | 'email' | 'sms')[];
  actionUrl?: string;
}

interface BulkMessageResult {
  userId: string;
  status: "success" | "error";
  data?: unknown;
  error?: string;
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const body = (await req.json()) as BulkMessageRequest;
        const { userIds, title, message, type = "info", channels = ["app"], actionUrl } = body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
          return badRequestResponse("يجب تحديد مستخدم واحد على الأقل");
        }

        if (!title || !message) {
          return badRequestResponse("عنوان ونص الرسالة مطلوبان");
        }

        if (!channels || !Array.isArray(channels) || channels.length === 0) {
          return badRequestResponse("يجب تحديد قناة واحدة على الأقل");
        }

        // إرسال الإشعارات لجميع المستخدمين المحددين
        const results: BulkMessageResult[] = await Promise.all(
          userIds.map(async (userId) => {
            try {
              return {
                userId,
                status: "success",
                data: await sendMultiChannelNotification({
                  userId,
                  title,
                  message,
                  type,
                  channels: channels,
                  actionUrl,
                }),
              };
            } catch (error: unknown) {
              return {
                userId,
                status: "error",
                error: error instanceof Error ? error.message : "خطأ غير معروف",
              };
            }
          })
        );

        const successCount = results.filter((r) => r.status === "success").length;
        const failureCount = results.length - successCount;

        return successResponse(
          { results, summary: { total: userIds.length, success: successCount, failure: failureCount } },
          `تمت معالجة الإرسال لـ ${userIds.length} محارب`,
          201
        );
      } catch (error: unknown) {
        return handleApiError(error);
      }
    });
  });
}
