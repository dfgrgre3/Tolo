/**
 * File Type Validator Utility
 * Verifies file types using magic bytes (file signatures) for enhanced security
 * This prevents MIME type spoofing where users rename files with wrong extensions
 */

// Magic bytes signatures for common file types
const FILE_SIGNATURES: Record<string, { signature: number[]; mimeType: string; extensions: string[] }> = {
    // Images
    'image/jpeg': { signature: [0xFF, 0xD8, 0xFF], mimeType: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
    'image/png': { signature: [0x89, 0x50, 0x4E, 0x47], mimeType: 'image/png', extensions: ['png'] },
    'image/webp': { signature: [0x52, 0x49, 0x46, 0x46], mimeType: 'image/webp', extensions: ['webp'] }, // RIFF header, need additional check
    'image/gif': { signature: [0x47, 0x49, 0x46, 0x38], mimeType: 'image/gif', extensions: ['gif'] },

    // Videos
    'video/mp4': { signature: [0x66, 0x74, 0x79, 0x70], mimeType: 'video/mp4', extensions: ['mp4', 'm4v'] }, // 'ftyp' at offset 4
    'video/webm': { signature: [0x1A, 0x45, 0xDF, 0xA3], mimeType: 'video/webm', extensions: ['webm'] },
    'video/ogg': { signature: [0x4F, 0x67, 0x67, 0x53], mimeType: 'video/ogg', extensions: ['ogv', 'ogg'] },
    'video/quicktime': { signature: [0x66, 0x72, 0x65, 0x65], mimeType: 'video/quicktime', extensions: ['mov', 'qt'] }, // 'free' or 'moov'
    'video/x-matroska': { signature: [0x1A, 0x45, 0xDF, 0xA3], mimeType: 'video/x-matroska', extensions: ['mkv', 'mk3d', 'mka'] },
    'video/mpeg': { signature: [0x00, 0x00, 0x01, 0xBA], mimeType: 'video/mpeg', extensions: ['mpeg', 'mpg', 'mpe'] },

    // Documents
    'application/pdf': { signature: [0x25, 0x50, 0x44, 0x46], mimeType: 'application/pdf', extensions: ['pdf'] },
    'application/msword': { signature: [0xD0, 0xCF, 0x11, 0xE0], mimeType: 'application/msword', extensions: ['doc'] },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        signature: [0x50, 0x4B, 0x03, 0x04], mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extensions: ['docx']
    },

    // E-books
    'application/epub+zip': { signature: [0x50, 0x4B, 0x03, 0x04], mimeType: 'application/epub+zip', extensions: ['epub'] },
    'application/x-mobipocket-ebook': { signature: [0x42, 0x4F, 0x4F, 0x4B], mimeType: 'application/x-mobipocket-ebook', extensions: ['mobi', 'prc'] },

    // Archives (for compressed files)
    'application/zip': { signature: [0x50, 0x4B, 0x03, 0x04], mimeType: 'application/zip', extensions: ['zip'] },
    'application/x-rar-compressed': { signature: [0x52, 0x61, 0x72, 0x21], mimeType: 'application/x-rar-compressed', extensions: ['rar'] },
};

// Additional offset for some formats
const SIGNATURE_OFFSETS: Record<string, number> = {
    'video/mp4': 4, // 'ftyp' appears at offset 4
    'video/quicktime': 4, // 'moov' or 'free' at offset 4
    'image/webp': 8, // RIFF header + 'WEBP' at offset 8
};

export interface FileValidationResult {
    isValid: boolean;
    detectedMimeType?: string;
    detectedExtension?: string;
    error?: string;
}

/**
 * Validates a file's actual type by checking its magic bytes
 * @param buffer - The file buffer to check
 * @param declaredMimeType - The MIME type declared by the browser/client
 * @param allowedTypes - Array of allowed MIME types
 * @returns Validation result
 */
export function validateFileType(
    buffer: Buffer,
    declaredMimeType: string,
    allowedTypes: string[]
): FileValidationResult {
    // Check if declared MIME type is in allowed list
    if (!allowedTypes.includes(declaredMimeType)) {
        return {
            isValid: false,
            error: `نوع الملف المُعلن (${declaredMimeType}) غير مسموح به`
        };
    }

    // If buffer is too small, can't validate
    if (buffer.length < 12) {
        return {
            isValid: false,
            error: 'حجم الملف صغير جداً للتحقق من نوعه'
        };
    }

    // Try to detect actual file type from magic bytes
    const detected = detectFileType(buffer);

    if (!detected) {
        return {
            isValid: false,
            error: 'تعذر تحديد نوع الملف من محتواه. الملف قد يكون تالفاً أو غير مدعوم.'
        };
    }

    // Check if detected type matches declared type (allow some flexibility)
    if (!isCompatibleType(declaredMimeType, detected.mimeType)) {
        return {
            isValid: false,
            detectedMimeType: detected.mimeType,
            detectedExtension: detected.extension,
            error: `نوع الملف المُعلن (${declaredMimeType}) لا يطابق المحتوى الفعلي (${detected.mimeType}). قد يكون الملف مخادعاً.`
        };
    }

    // Check if the detected type is in allowed types
    if (!allowedTypes.includes(detected.mimeType)) {
        return {
            isValid: false,
            detectedMimeType: detected.mimeType,
            error: `نوع الملف الفعلي (${detected.mimeType}) غير مسموح به`
        };
    }

    return {
        isValid: true,
        detectedMimeType: detected.mimeType,
        detectedExtension: detected.extension
    };
}

/**
 * Detects file type from buffer using magic bytes
 */
function detectFileType(buffer: Buffer): { mimeType: string; extension: string } | null {
    for (const [mimeType, config] of Object.entries(FILE_SIGNATURES)) {
        const offset = SIGNATURE_OFFSETS[mimeType] || 0;

        if (buffer.length < offset + config.signature.length) continue;

        let matches = true;
        for (let i = 0; i < config.signature.length; i++) {
            if (buffer[offset + i] !== config.signature[i]) {
                matches = false;
                break;
            }
        }

        if (matches) {
            // Special case for WebP: need to check for 'WEBP' at offset 8
            if (mimeType === 'image/webp') {
                const webpSignature = [0x57, 0x45, 0x42, 0x50]; // 'WEBP'
                let webpMatches = true;
                for (let i = 0; i < webpSignature.length; i++) {
                    if (buffer[8 + i] !== webpSignature[i]) {
                        webpMatches = false;
                        break;
                    }
                }
                if (!webpMatches) continue;
            }

            // Special case for MP4: need to check for 'ftyp' at offset 4
            if (mimeType === 'video/mp4') {
                const ftypSignature = [0x66, 0x74, 0x79, 0x70]; // 'ftyp'
                let ftypMatches = true;
                for (let i = 0; i < ftypSignature.length; i++) {
                    if (buffer[4 + i] !== ftypSignature[i]) {
                        ftypMatches = false;
                        break;
                    }
                }
                if (!ftypMatches) continue;
            }

            return {
                mimeType: config.mimeType,
                extension: config.extensions[0]
            };
        }
    }

    return null;
}

/**
 * Checks if two MIME types are compatible
 * (e.g., video/mp4 and video/x-mp4 might be considered compatible)
 */
function isCompatibleType(declared: string, detected: string): boolean {
    // Exact match
    if (declared === detected) return true;

    // Compatible video types
    const videoTypes = ['video/mp4', 'video/x-mp4', 'video/mpeg4'];
    if (videoTypes.includes(declared) && videoTypes.includes(detected)) return true;

    // Compatible image types
    const imageTypes = ['image/jpeg', 'image/jpg'];
    if (imageTypes.includes(declared) && imageTypes.includes(detected)) return true;

    // For DOCX and similar Office docs, they're all ZIP-based
    if (declared.includes('officedocument') && detected === 'application/zip') {
        // ZIP signature is common for Office docs, need deeper check
        // For now, allow it
        return true;
    }

    return false;
}

/**
 * Gets allowed MIME types for different upload contexts
 */
export const ALLOWED_FILE_TYPES = {
    // For general uploads (images, videos, basic docs)
    general: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-matroska',
        'video/mpeg',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],

    // For book uploads (PDF, EPUB, MOBI)
    books: [
        'application/pdf',
        'application/epub+zip',
        'application/x-mobipocket-ebook',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],

    // For video uploads only
    videos: [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-matroska',
        'video/mpeg',
    ],

    // For image uploads only
    images: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
    ],

    // For document uploads
    documents: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/epub+zip',
    ]
};

/**
 * Validates file size
 */
export function validateFileSize(
    fileSize: number,
    maxSizeBytes: number
): { isValid: boolean; error?: string } {
    if (fileSize > maxSizeBytes) {
        const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
        return {
            isValid: false,
            error: `حجم الملف (${Math.round(fileSize / (1024 * 1024))}MB) يتجاوز الحد الأقصى المسموح (${maxSizeMB}MB)`
        };
    }
    return { isValid: true };
}

/**
 * Sanitizes filename to prevent path traversal and other issues
 */
export function sanitizeFilename(filename: string): string {
    // Remove any directory components
    const basename = filename.split(/[\\/]/).pop() || 'upload';

    // Remove any null bytes
    let sanitized = basename.replace(/\0/g, '');

    // Remove or replace dangerous characters
    sanitized = sanitized.replace(/[^a-zA-Z0-9._\u0600-\u06FF\u0621-\u064A\u0660-\u0669\s-]/g, '_');

    // Limit length
    if (sanitized.length > 255) {
        const ext = sanitized.split('.').pop() || '';
        sanitized = sanitized.substring(0, 250) + '.' + ext;
    }

    return sanitized || 'upload';
}