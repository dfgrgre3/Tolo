import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { handleApiError, successResponse, badRequestResponse } from '@/lib/api-utils';
import { ERROR_CODES } from '@/lib/error-codes';
import { ensureUser } from "@/lib/user-utils";
import { logger } from '@/lib/logger';
import { StorageService } from '@/lib/storage';

// POST upload a new book file (Refactored for S3/CloudFront)
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify user authentication
      const token = req.headers.get('authorization')?.replace('Bearer ', '');
      if (!token) {
        return badRequestResponse("Authorization token required", ERROR_CODES.UNAUTHORIZED);
      }
      
      const userId = await ensureUser();
      if (!userId) {
        return badRequestResponse("Invalid or expired token", ERROR_CODES.UNAUTHORIZED);
      }

      // Get form data
      const formData = await request.formData();
      
      const title = formData.get('title') as string;
      const author = formData.get('author') as string;
      const description = formData.get('description') as string;
      const subjectId = formData.get('subjectId') as string;
      const tagsString = formData.get('tags') as string;
      const coverFile = formData.get('cover') as File | null;
      const bookFile = formData.get('bookFile') as File;

      // Validate required fields
      if (!title || !author || !description || !subjectId || !bookFile) {
        return badRequestResponse("Missing required fields", ERROR_CODES.MISSING_PARAMETER);
      }

      // Process tags
      let tags: string[] = [];
      if (tagsString) {
        try {
          tags = JSON.parse(tagsString);
          if (!Array.isArray(tags)) {
            tags = [tagsString];
          }
        } catch {
          tags = [tagsString];
        }
      }

      // 1. Upload book file to S3
      const fileExtension = bookFile.name.split('.').pop() || 'pdf';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const downloadUrl = await StorageService.uploadFile(bookFile, fileName, bookFile.type, 'books');

      // 2. Handle cover image if provided (to S3)
      let coverUrl: string | null = null;
      if (coverFile) {
        const coverExtension = coverFile.name.split('.').pop() || 'jpg';
        const coverFileName = `${Date.now()}_cover.${coverExtension}`;
        coverUrl = await StorageService.uploadFile(coverFile, coverFileName, coverFile.type, 'books/covers');
      }

      // Create book record in database
      const newBook = await prisma.book.create({
        data: {
          title,
          author,
          description,
          subjectId,
          coverUrl,
          downloadUrl,
          tags,
        }
      });

      return successResponse({
        id: newBook.id,
        title: newBook.title,
        downloadUrl: newBook.downloadUrl,
        coverUrl: newBook.coverUrl,
        message: "Book uploaded successfully to cloud storage"
      }, undefined, 201);
    } catch (error: any) {
      logger.error("Upload error:", error);
      return handleApiError(error);
    }
  });
}

// DELETE remove a book (Cleanup S3)
export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const bookId = searchParams.get("id");

      if (!bookId) {
        return badRequestResponse("Book ID is required", ERROR_CODES.MISSING_PARAMETER);
      }

      // Verify user authentication
      const token = req.headers.get('authorization')?.replace('Bearer ', '');
      if (!token) {
        return badRequestResponse("Authorization token required", ERROR_CODES.UNAUTHORIZED);
      }
      
      const userId = await ensureUser();
      if (!userId) {
        return badRequestResponse("Invalid or expired token", ERROR_CODES.UNAUTHORIZED);
      }

      // Find the book
      const book = await prisma.book.findUnique({
        where: { id: bookId as string }
      });

      if (!book) {
        return badRequestResponse("Book not found", ERROR_CODES.NOT_FOUND);
      }

      // Delete files from S3 using CloudFront URLs recorded in DB
      if (book.downloadUrl) {
        await StorageService.deleteFile(book.downloadUrl);
      }

      if (book.coverUrl) {
        await StorageService.deleteFile(book.coverUrl);
      }

      // Delete book from database
      await prisma.book.delete({
        where: { id: bookId as string }
      });

      return successResponse({ message: "Book and associated cloud files deleted successfully" });
    } catch (error: unknown) {
      return handleApiError(error);
    }
  });
}
