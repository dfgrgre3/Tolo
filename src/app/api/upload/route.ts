import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // تحقق من التوثيق
      const verification = await authService.verifyTokenFromRequest(req, { checkSession: true });
      if (!verification.isValid) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const data = await req.formData();
    const fileEntry = data.get('file');

    if (!(fileEntry instanceof Blob)) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await fileEntry.arrayBuffer());

    // إنشاء اسم ملف فريد
    const originalName = (fileEntry as any).name || 'upload';
    const fileName = `${uuidv4()}-${originalName}`;
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadsDir, fileName);

    // التأكد من وجود مجلد الرفع
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    // حفظ الملف على القرص
    await writeFile(filePath, buffer);

    // رابط الملف
    const fileUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      message: 'تم رفع الملف بنجاح',
      fileUrl,
      fileName: originalName,
      fileSize: buffer.length,
      fileType: fileEntry.type
    });
  } catch (error) {
    logger.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'فشل رفع الملف' },
      { status: 500 }
    );
    }
  });
}
