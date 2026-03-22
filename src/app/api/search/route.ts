import { NextRequest, NextResponse } from "next/server";

import { prisma } from '@/lib/db';

import { opsWrapper } from "@/lib/middleware/ops-middleware";

import { logger } from '@/lib/logger';

import { TEACHER_ROLES } from '@/lib/constants';

import { CacheService } from '@/lib/cache-service-unified';

import {

	createStandardErrorResponse,

	createSuccessResponse,

	addSecurityHeaders,

	successResponse,

	handleApiError

} from '@/lib/api-utils';



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

				const response = successResponse({ results: [], total: 0 });

				return addSecurityHeaders(response);

			}



			if (isNaN(limit) || limit < 1 || limit > 100) {

				const response = createStandardErrorResponse(new Error("الحد غير صحيح. يجب أن يكون بين 1 و 100"), "invalid_limit", 400);

				return addSecurityHeaders(response as NextResponse);

			}

			// Create cache key for search results
			const cacheKey = `search:${scope}:${query.trim()}:${limit}`;

			// Try to get from cache first
			const cachedResults = await CacheService.get<SearchResult[]>(cacheKey);
			if (cachedResults) {
				logger.info(`Cache hit for search: ${query}`);
				const response = successResponse({ results: cachedResults, total: cachedResults.length });
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

						const title = course.name || "مادة بدون عنوان";

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

							category: course.type || "عام",

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

								{ role: { in: [...TEACHER_ROLES] } },

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

						const title = teacher.name || teacher.email || "8&7�88&";

						const relevance = calculateRelevance(title, searchTerm);



						results.push({

							id: `teacher-${teacher.id}`,

							type: "teacher",

							title,

							description: `معلم - ${teacher.email}`,

							category: "معلمين",

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

						const title = post.title || "موضوع بدون عنوان";

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

							category: post.category?.name || "عام",

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

								{ subjectId: { contains: query, mode: "insensitive" } },

								{ subject: { name: { contains: query, mode: "insensitive" } } },

							],

						},

						include: {

							subject: true

						},

						take: limit,

						orderBy: { createdAt: "desc" },

					});



					const examsTimeoutPromise = new Promise<never>((resolve, reject) => {

						setTimeout(() => reject(new Error('Database query timeout')), 5000);

					});



					const exams = await Promise.race([examsPromise, examsTimeoutPromise]);



					exams.forEach((exam: any) => {

						const title = exam.title || "امتحان بدون عنوان";

						const subjectName = exam.subject?.name || exam.subjectId || "عام";

						const relevance = Math.max(

							calculateRelevance(title, searchTerm),

							calculateRelevance(subjectName, searchTerm)

						);



						results.push({

							id: `exam-${exam.id}`,

							type: "exam",

							title,

							description: `امتحان ${subjectName} - ${exam.year}`,

							category: subjectName,

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

			// Cache the results for 5 minutes
			await CacheService.set(cacheKey, sortedResults, 300);
			logger.info(`Cached search results for: ${query}`);

			const response = createSuccessResponse({

				results: sortedResults,

				total: sortedResults.length,

				query,

				scope,

			});

			return addSecurityHeaders(response);

		} catch (error) {

			logger.error("Error in search API:", error);

			return handleApiError(error);

		}

	});

}

