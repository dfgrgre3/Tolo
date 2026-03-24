import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Simple upload endpoint called');
    
    const data = await request.formData();
    const fileEntry = data.get('file');

    if (!(fileEntry instanceof Blob)) {
      console.log('❌ No file uploaded');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    console.log(`📁 File received: ${fileEntry.name} (${fileEntry.size} bytes)`);

    const buffer = Buffer.from(await fileEntry.arrayBuffer());

    // إنشاء اسم ملف فريد
    const originalName = (fileEntry as any).name || 'upload';
    const fileName = `${uuidv4()}-${originalName}`;
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadsDir, fileName);

    // التأكد من وجود مجلد الرفع
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Created uploads directory');
    }

    // حفظ الملف على القرص
    await writeFile(filePath, buffer);
    console.log(`✅ File saved: ${filePath}`);

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
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: 'فشل رفع الملف', details: (error as any).message },
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
