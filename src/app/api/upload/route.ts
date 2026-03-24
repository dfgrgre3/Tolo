import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { withAdmin, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  return withAdmin(request, async (authUser) => {
    try {
      const data = await request.formData();
      const fileEntry = data.get('file');

      if (!(fileEntry instanceof Blob)) {
        return NextResponse.json(
          { error: 'لم يتم اختيار ملف' },
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

      logger.info(`File uploaded successfully: ${fileName} by user ${authUser.userId}`);

      return NextResponse.json({
        message: 'تم رفع الملف بنجاح',
        fileUrl,
        fileName: originalName,
        fileSize: buffer.length,
        fileType: fileEntry.type
      });
    } catch (error: any) {
      logger.error('Error uploading file:', error);
      return NextResponse.json(
        {
          error: 'فشل رفع الملف. تأكد من حجم الملف وصلاحيات الكتابة.',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }
  });
}
