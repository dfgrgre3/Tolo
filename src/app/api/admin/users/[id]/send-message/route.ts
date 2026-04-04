import { NextRequest } from "next/server";
import { withAdmin, handleApiError, successResponse, badRequestResponse } from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { sendMultiChannelNotification } from "@/services/notification-sender";

interface NotificationRequest {
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  channels?: ("app" | "email" | "sms")[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const { id: userId } = await params;
        
        if (!userId) {
          return badRequestResponse("معرف المستخدم مطلوب");
        }

        const body = (await req.json()) as NotificationRequest;
        const { title, message, type = "info", channels = ["app"] } = body;

        if (!title || !message) {
          return badRequestResponse("عنوان ونص الرسالة مطلوبان");
        }

        if (!channels || !Array.isArray(channels) || channels.length === 0) {
          return badRequestResponse("يجب تحديد قناة واحدة على الأقل");
        }

        // إرسال الإشعار عبر القنوات المحددة
        const results = await sendMultiChannelNotification({
          userId,
          title,
          message,
          type,
          channels: channels,
        });

        const hasSuccess = results.app || (results.email && results.email.success) || (results.sms && results.sms.success);

        if (!hasSuccess) {
           return successResponse(results, "تعذر إرسال الرسالة عبر أي من القنوات المحددة", 500);
        }

        return successResponse(results, "تم إرسال الرسالة الملكية بنجاح", 201);
      } catch (error: unknown) {
        return handleApiError(error);
      }
    });
  });
}
