export interface SearchResult {
	id: string;
	title: string;
	url: string;
	type: string;
	description?: string;
	category?: string;
}

export type SearchScope = "all" | "courses" | "teachers" | "forum" | "exams";
