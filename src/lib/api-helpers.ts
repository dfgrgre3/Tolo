import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export * from './api-utils';

export function createSuccessResponse(data: any, message?: string, status: number = 200) {
    return NextResponse.json({ success: true, data, message }, { status });
}

export function createStandardErrorResponse(error: any, defaultMessage: string, status: number = 500) {
    const message = error instanceof Error ? error.message : defaultMessage;
    return NextResponse.json({ success: false, error: message }, { status });
}

export async function parseRequestBody<T>(req: NextRequest, options?: { maxSize?: number, required?: boolean }) {
    try {
        const text = await req.text();
        if (!text && options?.required) {
            return { success: false as const, error: createStandardErrorResponse('Missing required body', 'Missing body', 400) };
        }
        if (!text) {
            return { success: true as const, data: {} as T };
        }
        if (options?.maxSize && text.length > options.maxSize) {
            return { success: false as const, error: createStandardErrorResponse('Payload too large', 'Payload too large', 413) };
        }
        const data = JSON.parse(text) as T;
        return { success: true as const, data };
    } catch (e) {
        return { success: false as const, error: createStandardErrorResponse(e, 'Invalid JSON', 400) };
    }
}
