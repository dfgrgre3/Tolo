import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server-user";
import { generateUserPath, validateFileType, validateFileSize, formatFileSize } from "@/lib/storage";
import { sanitizeSvg } from "@/lib/storage/svg-sanitizer";
import { SERVER_MAX_FILE_SIZE, SERVER_ALLOWED_TYPES, sanitizeFolder, isPublicBucket } from "@/lib/storage/upload-policy";
import { isSameOriginRequest } from "@/lib/security/origin-check";
import { errorService } from "@/lib/logging/error-service";