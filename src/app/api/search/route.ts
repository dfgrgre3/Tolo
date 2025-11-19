import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

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
			return NextResponse.json({ results: [], total: 0 });
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

		// Search in Courses (Subjects)
		if (scope === "all" || scope === "courses") {
			try {
				const courses = await prisma.subject.findMany({
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

		// Search in Teachers
		if (scope === "all" || scope === "teachers") {
			try {
				// Search in local teachers if they exist in the database
				// For now, we'll search in a hypothetical teachers table or use AI search
				// This is a placeholder - adjust based on your actual schema
				const teachers = await prisma.user.findMany({
					where: {
						AND: [
							{ role: { in: ["TEACHER", "ADMIN"] } },
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

				teachers.forEach((teacher: { id: string; name: string | null; email: string }) => {
					const title = teacher.name || teacher.email || "معلم";
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

		// Search in Forum Posts
		if (scope === "all" || scope === "forum") {
			try {
				const posts = await prisma.forumPost.findMany({
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

		// Search in Exams
		if (scope === "all" || scope === "exams") {
			try {
				const exams = await prisma.exam.findMany({
					where: {
						OR: [
							{ title: { contains: query, mode: "insensitive" } },
							{ subject: { contains: query, mode: "insensitive" } },
						],
					},
					take: limit,
					orderBy: { createdAt: "desc" },
				});

				exams.forEach((exam: { id: string; title: string; subject: string; year: number }) => {
					const title = exam.title || "امتحان بدون عنوان";
					const relevance = Math.max(
						calculateRelevance(title, searchTerm),
						calculateRelevance(exam.subject || "", searchTerm)
					);

					results.push({
						id: `exam-${exam.id}`,
						type: "exam",
						title,
						description: `امتحان ${exam.subject} - ${exam.year}`,
						category: exam.subject || "عام",
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

		return NextResponse.json({
			results: sortedResults,
			total: sortedResults.length,
			query,
			scope,
		});
	} catch (error) {
		logger.error("Error in search API:", error);
		return NextResponse.json(
			{ error: "حدث خطأ في البحث", results: [], total: 0 },
			{ status: 500 }
		);
		}
	});
}
