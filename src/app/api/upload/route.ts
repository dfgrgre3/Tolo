import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { withAdmin } from '@/lib/api-utils';

// Constants for security limits
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB default
const MAX_FILE_SIZE = Number.parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || `${DEFAULT_MAX_FILE_SIZE}`, 10);
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/mpeg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

function isFormDataParseError(error: unknown) {
  return error instanceof Error && error.message.includes('Failed to parse body as FormData');
}

export async function POST(request: NextRequest) {
  return withAdmin(request, async (authUser) => {
    try {
      const data = await request.formData();
      const fileEntry = data.get('file');

      // 1. Basic type check
      if (!(fileEntry instanceof Blob)) {
        return NextResponse.json(
          { error: 'لم يتم اختيار ملف صالح' },
          { status: 400 }
        );
      }

      // 2. Security: MIME type validation
      if (!ALLOWED_MIME_TYPES.includes(fileEntry.type)) {
        logger.warn(`Rejected upload with invalid MIME type: ${fileEntry.type} from admin ${authUser.userId}`);
        return NextResponse.json(
          { error: `نوع الملف غير مسموح به (${fileEntry.type}). يرجى رفع صور أو فيديوهات أو مستندات مدعومة.` },
          { status: 415 }
        );
      }

      // 3. Security: File Size limit
      if (fileEntry.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `حجم الملف كبير جدًا. الحد الأقصى هو ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB` },
          { status: 413 }
        );
      }

      const buffer = Buffer.from(await fileEntry.arrayBuffer());

      // 4. Filename sanitization
      const file = fileEntry as unknown as File;
      const originalName = file.name || 'upload';
      const extension = originalName.split('.').pop() || '';
      const safeFileName = `${uuidv4()}.${extension}`;
      
      const uploadsDir = join(process.cwd(), 'public', 'uploads');
      const filePath = join(uploadsDir, safeFileName);

      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }

      // 5. Save to disk
      await writeFile(filePath, buffer);

      const fileUrl = `/uploads/${safeFileName}`;

      logger.info(`File uploaded successfully: ${safeFileName} (${buffer.length} bytes) by admin ${authUser.userId}`);

      return NextResponse.json({
        message: 'تم رفع الملف بنجاح',
        fileUrl,
        fileName: originalName,
        fileSize: buffer.length,
        fileType: file.type
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error uploading file:', { error: errorMessage });

      if (isFormDataParseError(error)) {
        return NextResponse.json(
          {
            error: 'تعذر قراءة الملف المرفوع. غالباً حجم الملف كبير لطلب رفع واحد.',
            details: 'جرّب الرفع بعد إعادة تشغيل الخادم؛ سيتم تحويل الملفات الكبيرة إلى رفع مجزأ تلقائياً.'
          },
          { status: 413 }
        );
      }

      return NextResponse.json(
        {
          error: 'فشل رفع الملف نتيجة خطأ داخلي.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      );
    }
  });
}
