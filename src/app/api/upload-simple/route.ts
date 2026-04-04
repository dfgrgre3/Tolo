import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    logger.info('🔄 Simple upload endpoint called');
    
    const data = await request.formData();
    const fileEntry = data.get('file');

    if (!(fileEntry instanceof Blob)) {
      logger.info('❌ No file uploaded');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const file = fileEntry as unknown as File;
    logger.info(`📁 File received: ${file.name || 'blob'} (${file.size} bytes)`);

    const buffer = Buffer.from(await file.arrayBuffer());

    // إنشاء اسم ملف فريد
    const originalName = file.name || 'upload';
    const fileName = `${uuidv4()}-${originalName}`;
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadsDir, fileName);

    // التأكد من وجود مجلد الرفع
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
      logger.info('📁 Created uploads directory');
    }

    // حفظ الملف على القرص
    await writeFile(filePath, buffer);
    logger.info(`✅ File saved: ${filePath}`);

    // رابط الملف
    const fileUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      message: 'تم رفع الملف بنجاح',
      fileUrl,
      fileName: originalName,
      fileSize: buffer.length,
      fileType: file.type
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Upload error:', { error: errorMessage });
    return NextResponse.json(
      { error: 'فشل رفع الملف', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Simple upload endpoint is working',
    usage: 'POST with FormData containing a "file" field',
    timestamp: new Date().toISOString()
  });
}
