import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db-unified';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { handleApiError, successResponse, badRequestResponse } from '@/lib/api-utils';
import { ERROR_CODES } from '@/lib/error-codes';
import { ensureUser } from "@/lib/user-utils";
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// POST upload a new book file
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify user authentication
      const token = req.headers.get('authorization')?.replace('Bearer ', '');
      if (!token) {
        return badRequestResponse("Authorization token required", ERROR_CODES.UNAUTHORIZED);
      }
      
      // ensureUser() in this project returns a local user id (guest/user identifier)
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

      // Ensure upload directory exists
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'books');
      await fs.mkdir(uploadDir, { recursive: true });

      // Process tags
      let tags: string[] = [];
      if (tagsString) {
        try {
          tags = JSON.parse(tagsString);
          if (!Array.isArray(tags)) {
            tags = [tagsString];
          }
        } catch {
          tags = [tagsString]; // Fallback to single tag
        }
      }

      // Generate unique filenames
      const fileExtension = path.extname(bookFile.name);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);

      // Write book file
      const bytes = await bookFile.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(bytes));

      // Handle cover image if provided
      let coverUrl: string | null = null;
      if (coverFile) {
        const coverExtension = path.extname(coverFile.name);
        const coverFileName = `${uuidv4()}_cover${coverExtension}`;
        const coverFilePath = path.join(uploadDir, coverFileName);
        
        const coverBytes = await coverFile.arrayBuffer();
        await fs.writeFile(coverFilePath, Buffer.from(coverBytes));
        
        coverUrl = `/uploads/books/${coverFileName}`;
      }

      // Create book record in database
      const newBook = await prisma.book.create({
        data: {
          title,
          author,
          description,
          subjectId,
          coverUrl,
          downloadUrl: `/uploads/books/${fileName}`,
          tags,
        }
      });

      return successResponse({
        id: newBook.id,
        title: newBook.title,
        downloadUrl: newBook.downloadUrl,
        coverUrl: newBook.coverUrl,
        message: "Book uploaded successfully"
      }, undefined, 201);
    } catch (error: any) {
      console.error("Upload error:", error);
      return handleApiError(error);
    }
  });
}

// DELETE remove a book
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

      // Book model does not store uploader/owner info; at this point we only require authentication.

      // Delete files from filesystem
      if (book.downloadUrl) {
        const filePath = path.join(process.cwd(), 'public', book.downloadUrl);
        try {
          await fs.unlink(filePath);
        } catch (err) {
          console.error("Error deleting book file:", err);
          // Continue even if file deletion fails
        }
      }

      if (book.coverUrl) {
        const coverPath = path.join(process.cwd(), 'public', book.coverUrl);
        try {
          await fs.unlink(coverPath);
        } catch (err) {
          console.error("Error deleting cover file:", err);
          // Continue even if file deletion fails
        }
      }

      // Delete book from database
      await prisma.book.delete({
        where: { id: bookId as string }
      });

      return successResponse({ message: "Book deleted successfully" });
    } catch (error: unknown) {
      return handleApiError(error);
    }
  });
}