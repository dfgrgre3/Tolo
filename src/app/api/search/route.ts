import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { TEACHER_ROLES } from '@/lib/constants';
import { 
  createStandardErrorResponse, 
  createSuccessResponse,
  addSecurityHeaders 
} from '@/app/api/auth/_helpers';

type SearchScope = "all" | "courses" | "teachers" | "forum" | "exams";

interface SearchResult {
	id: string;
	type: "course" | "teacher" | "forum" | "exam";
	title: string;
	description?: string;
	category?: string;
	url: string;
	relevance: number;
}

export async function GET(request: NextRequest) {
	return opsWrapper(request, async (req) => {
		try {
			const { searchParams } = new URL(req.url);
		const query = searchParams.get("q") || "";
		const scope = (searchParams.get("scope") || "all") as SearchScope;
		const limit = parseInt(searchParams.get("limit") || "10");

		if (!query.trim()) {
			const response = NextResponse.json({ results: [], total: 0 });
			return addSecurityHeaders(response);
		}

		// Validate limit parameter
		if (isNaN(limit) || limit < 1 || limit > 100) {
			const response = NextResponse.json(
				{ error: "ط­ط¯ ط؛ظٹط± طµط­ظٹط­. ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ط¨ظٹظ† 1 ظˆ 100", code: 'INVALID_LIMIT' },
				{ status: 400 }
			);
			return addSecurityHeaders(response);
		}

		const results: SearchResult[] = [];
		const searchTerm = query.toLowerCase().trim();

		// Helper function to calculate relevance
		const calculateRelevance = (text: string, term: string): number => {
			const lowerText = text.toLowerCase();
			if (lowerText === term) return 100;
			if (lowerText.startsWith(term)) return 90;
			if (lowerText.includes(term)) return 70;
			return 50;
		};

		// Search in Courses (Subjects) with timeout protection
		if (scope === "all" || scope === "courses") {
			try {
				const coursesPromise = prisma.subject.findMany({
					where: {
						OR: [
							{ name: { contains: query, mode: "insensitive" } },
							{ description: { contains: query, mode: "insensitive" } },
						],
						isActive: true,
					},
					take: limit,
					orderBy: { name: "asc" },
				});

				const timeoutPromise = new Promise<never>((resolve, reject) => {
					setTimeout(() => reject(new Error('Database query timeout')), 5000);
				});

				const courses = await Promise.race([coursesPromise, timeoutPromise]);

				courses.forEach((course: { id: string; name: string | null; description: string | null; type: string | null }) => {
					const title = course.name || "ظ…ط§ط¯ط© ط¨ط¯ظˆظ† ط¹ظ†ظˆط§ظ†";
					const description = course.description || "";
					const relevance = Math.max(
						calculateRelevance(title, searchTerm),
						calculateRelevance(description, searchTerm)
					);

					results.push({
						id: `course-${course.id}`,
						type: "course",
						title,
						description,
						category: course.type || "ط¹ط§ظ…",
						url: `/courses/${course.id}`,
						relevance,
					});
				});
			} catch (error) {
				logger.error("Error searching courses:", error);
			}
		}

		// Search in Teachers with timeout protection
		if (scope === "all" || scope === "teachers") {
			try {
				// Search in local teachers if they exist in the database
				// For now, we'll search in a hypothetical teachers table or use AI search
				// This is a placeholder - adjust based on your actual schema
				const teachersPromise = prisma.user.findMany({
					where: {
						AND: [
							{ role: { in: TEACHER_ROLES as unknown as string[] } },
							{
								OR: [
									{ name: { contains: query, mode: "insensitive" } },
									{ email: { contains: query, mode: "insensitive" } },
								],
							},
						],
					},
					take: limit,
					select: {
						id: true,
						name: true,
						email: true,
					},
				});

				const teachersTimeoutPromise = new Promise<never>((resolve, reject) => {
					setTimeout(() => reject(new Error('Database query timeout')), 5000);
				});

				const teachers = await Promise.race([teachersPromise, teachersTimeoutPromise]);

				teachers.forEach((teacher: { id: string; name: string | null; email: string }) => {
					const title = teacher.name || teacher.email || "ظ…ط¹ظ„ظ…";
					const relevance = calculateRelevance(title, searchTerm);

					results.push({
						id: `teacher-${teacher.id}`,
						type: "teacher",
						title,
						description: `ظ…ط¹ظ„ظ… - ${teacher.email}`,
						category: "ظ…ط¹ظ„ظ…ظٹظ†",
						url: `/teachers/${teacher.id}`,
						relevance,
					});
				});
			} catch (error) {
				logger.error("Error searching teachers:", error);
			}
		}

		// Search in Forum Posts with timeout protection
		if (scope === "all" || scope === "forum") {
			try {
				const postsPromise = prisma.forumPost.findMany({
					where: {
						OR: [
							{ title: { contains: query, mode: "insensitive" } },
							{ content: { contains: query, mode: "insensitive" } },
						],
					},
					take: limit,
					include: {
						category: {
							select: { name: true },
						},
						author: {
							select: { name: true },
						},
					},
					orderBy: { createdAt: "desc" },
				});

				const postsTimeoutPromise = new Promise<never>((resolve, reject) => {
					setTimeout(() => reject(new Error('Database query timeout')), 5000);
				});

				const posts = await Promise.race([postsPromise, postsTimeoutPromise]);

				posts.forEach((post: { id: string; title: string | null; content: string | null; category: { name: string } | null }) => {
					const title = post.title || "ظ…ظˆط¶ظˆط¹ ط¨ط¯ظˆظ† ط¹ظ†ظˆط§ظ†";
					const content = post.content || "";
					const relevance = Math.max(
						calculateRelevance(title, searchTerm),
						calculateRelevance(content.substring(0, 200), searchTerm)
					);

					results.push({
						id: `forum-${post.id}`,
						type: "forum",
						title,
						description: content.substring(0, 150) + (content.length > 150 ? "..." : ""),
						category: post.category?.name || "ط¹ط§ظ…",
						url: `/forum/${post.id}`,
						relevance,
					});
				});
			} catch (error) {
				logger.error("Error searching forum posts:", error);
			}
		}

		// Search in Exams with timeout protection
		if (scope === "all" || scope === "exams") {
			try {
				const examsPromise = prisma.exam.findMany({
					where: {
						OR: [
							{ title: { contains: query, mode: "insensitive" } },
							{ subject: { contains: query, mode: "insensitive" } },
						],
					},
					take: limit,
					orderBy: { createdAt: "desc" },
				});

				const examsTimeoutPromise = new Promise<never>((resolve, reject) => {
					setTimeout(() => reject(new Error('Database query timeout')), 5000);
				});

				const exams = await Promise.race([examsPromise, examsTimeoutPromise]);

				exams.forEach((exam: { id: string; title: string; subject: string; year: number }) => {
					const title = exam.title || "ط§ظ…طھط­ط§ظ† ط¨ط¯ظˆظ† ط¹ظ†ظˆط§ظ†";
					const relevance = Math.max(
						calculateRelevance(title, searchTerm),
						calculateRelevance(exam.subject || "", searchTerm)
					);

					results.push({
						id: `exam-${exam.id}`,
						type: "exam",
						title,
						description: `ط§ظ…طھط­ط§ظ† ${exam.subject} - ${exam.year}`,
						category: exam.subject || "ط¹ط§ظ…",
						url: `/exams/${exam.id}`,
						relevance,
					});
				});
			} catch (error) {
				logger.error("Error searching exams:", error);
			}
		}

		// Sort by relevance and limit results
		const sortedResults = results
			.sort((a, b) => b.relevance - a.relevance)
			.slice(0, limit * 2); // Return more results before limiting

		return createSuccessResponse({
			results: sortedResults,
			total: sortedResults.length,
			query,
			scope,
		});
	} catch (error) {
		logger.error("Error in search API:", error);
		return createStandardErrorResponse(
			error,
			"ط­ط¯ط« ط®ط·ط£ ظپظٹ ط§ظ„ط¨ط­ط«"
		);
		}
	});
}
