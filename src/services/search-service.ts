import { Client } from '@elastic/elasticsearch';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { BaseService } from '@/lib/base-service';

/**
 * GlobalSearchService - High-performance search for 10M+ records.
 * Powered by Elasticsearch to offload expensive ILIKE queries from PostgreSQL.
 */
export class GlobalSearchService extends BaseService {
  private static instance: GlobalSearchService;
  private client: Client | null = null;

  private constructor() {
    super('GlobalSearchService', { failureThreshold: 10 });
    this.initializeClient();
  }

  public static getInstance(): GlobalSearchService {
    if (!GlobalSearchService.instance) {
      GlobalSearchService.instance = new GlobalSearchService();
    }
    return GlobalSearchService.instance;
  }

  private async initializeClient() {
    if (process.env.ELASTICSEARCH_ENABLED === 'false') return;

    try {
      this.client = new Client({
        node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
        auth: process.env.ELASTICSEARCH_AUTH
          ? {
              username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
              password: process.env.ELASTICSEARCH_PASSWORD || '',
            }
          : undefined,
      });
    } catch (error) {
      logger.error('Failed to initialize Elasticsearch client for search:', error);
    }
  }

  /**
   * Search for books with ranking and relevance.
   */
  async searchBooks(query: string, limit: number = 20) {
    return this.runProtected('searchBooks', async () => {
      if (!this.client || !query) return [];

      const response = await this.client.search({
        index: 'thanawy-books',
        body: {
          query: {
            multi_match: {
              query,
              fields: ['title^3', 'author^2', 'description', 'tags'],
              fuzziness: 'AUTO',
            },
          },
          size: limit,
        },
      });

      return response.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source,
        score: hit._score,
      }));
    }, () => []);
  }

  /**
   * Search for courses.
   */
  async searchCourses(query: string, limit: number = 20) {
    return this.runProtected('searchCourses', async () => {
      if (!this.client || !query) return [];

      const response = await this.client.search({
        index: 'thanawy-courses',
        body: {
          query: {
            multi_match: {
              query,
              fields: ['title^3', 'description^2', 'subjectName', 'tags'],
              fuzziness: 'AUTO',
            },
          },
          size: limit,
        },
      });

      return response.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source,
        score: hit._score,
      }));
    }, () => []);
  }

  /**
   * Index or Update a book in Elasticsearch.
   */
  async indexBook(book: any) {
    if (!this.client) return;

    try {
      await this.client.index({
        index: 'thanawy-books',
        id: book.id,
        body: {
          title: book.title,
          author: book.author,
          description: book.description,
          subjectId: book.subjectId,
          tags: book.tags,
          coverUrl: book.coverUrl,
          createdAt: book.createdAt,
        },
      });
    } catch (error) {
      logger.error(`Failed to index book ${book.id} in Elasticsearch:`, error);
    }
  }

  /**
   * Index or Update a course.
   */
  async indexCourse(course: any) {
    if (!this.client) return;

    try {
      await this.client.index({
        index: 'thanawy-courses',
        id: course.id,
        body: {
          title: course.title,
          description: course.description,
          subjectName: course.subject?.name,
          teacherName: course.teacher?.name,
          tags: course.tags,
          price: course.price,
          createdAt: course.createdAt,
        },
      });
    } catch (error) {
      logger.error(`Failed to index course ${course.id}:`, error);
    }
  }

  /**
   * Bulk Sync Books from DB to Elasticsearch.
   */
  async bulkSyncBooks() {
    if (!this.client) return;

    try {
      const books = await prisma.book.findMany({
        select: {
          id: true,
          title: true,
          author: true,
          description: true,
          subjectId: true,
          tags: true,
          coverUrl: true,
          createdAt: true,
        },
      });

      const body = books.flatMap((doc: any) => [{ index: { _index: 'thanawy-books', _id: doc.id } }, doc]);
      
      if (body.length > 0) {
        await this.client.bulk({ refresh: true, body });
      }
      
      logger.info(`Successfully synced ${books.length} books to Elasticsearch.`);
    } catch (error) {
      logger.error('Bulk sync failed:', error);
    }
  }
}

export const searchService = GlobalSearchService.getInstance();
export default searchService;

