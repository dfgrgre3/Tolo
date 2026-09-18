/**
 * Support & Help Center — frontend foundation (Phase 1).
 * Route constants, validation primitives, config. No fake data fetching.
 * Backend API integration belongs to Phase 2.
 */
import { z } from 'zod';
import {
  SupportFeatureRequestStatus,
  SupportMessageType,
  SupportTicketPriority,
  SupportTicketSource,
  SupportTicketStatus,
} from '@thanawy/shared/types/support';

export const SUPPORT_ROUTES = {
  root: '/support',
  search: '/support/search',
  categories: '/support/categories',
  articles: '/support/articles',
  faq: '/support/faq',
  tickets: '/support/tickets',
  ticketById: (id: string) => `/support/tickets/${encodeURIComponent(id)}`,
  bugReport: '/support/bug-report',
  featureRequest: '/support/feature-request',
  status: '/support/status',
  incidents: '/support/incidents',
  // Legacy aliases (existing pages, reused — not duplicated):
  legacyFaq: '/faq',
  legacyContact: '/contact',
} as const;

export const SUPPORT_TICKET_SUBJECT_MIN = 8;
export const SUPPORT_TICKET_SUBJECT_MAX = 200;
export const SUPPORT_TICKET_BODY_MIN = 20;
export const SUPPORT_TICKET_BODY_MAX = 20000;
export const SUPPORT_ATTACHMENT_MAX_MB = 10;
export const SUPPORT_ATTACHMENT_ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/plain',
  'video/mp4',
] as const;

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(SUPPORT_TICKET_SUBJECT_MIN).max(SUPPORT_TICKET_SUBJECT_MAX),
  description: z.string().trim().min(SUPPORT_TICKET_BODY_MIN).max(SUPPORT_TICKET_BODY_MAX),
  categoryId: z.string().trim().min(1).max(100).optional(),
  subcategoryId: z.string().trim().min(1).max(100).optional(),
  priority: z.nativeEnum(SupportTicketPriority).default(SupportTicketPriority.NORMAL),
  source: z.nativeEnum(SupportTicketSource).default(SupportTicketSource.HELP_CENTER),
  relatedCourseId: z.string().trim().max(100).optional(),
  relatedOrderId: z.string().trim().max(100).optional(),
});
export type SupportTicketInput = z.infer<typeof supportTicketSchema>;

export const supportMessageSchema = z.object({
  body: z.string().trim().min(1).max(SUPPORT_TICKET_BODY_MAX),
  messageType: z.nativeEnum(SupportMessageType).default(SupportMessageType.CUSTOMER),
});
export type SupportMessageInput = z.infer<typeof supportMessageSchema>;

export const supportBugReportSchema = supportTicketSchema.extend({
  stepsToReproduce: z.string().trim().min(10).max(10000),
  expectedResult: z.string().trim().min(3).max(5000),
  actualResult: z.string().trim().min(3).max(5000),
  browser: z.string().trim().max(200).optional(),
  os: z.string().trim().max(200).optional(),
  device: z.string().trim().max(200).optional(),
  url: z.string().trim().max(2000).optional(),
  correlationId: z.string().trim().max(100).optional(),
});
export type SupportBugReportInput = z.infer<typeof supportBugReportSchema>;

export const supportFeatureRequestSchema = z.object({
  title: z.string().trim().min(8).max(200),
  description: z.string().trim().min(20).max(20000),
  useCase: z.string().trim().min(10).max(10000),
  category: z.string().trim().max(100).optional(),
});
export type SupportFeatureRequestInput = z.infer<typeof supportFeatureRequestSchema>;

export const supportRatingSchema = z.object({
  ticketId: z.string().trim().min(1).max(100),
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});
export type SupportRatingInput = z.infer<typeof supportRatingSchema>;

/** Re-export for convenience; server remains source of truth for transitions. */
export {
  SupportFeatureRequestStatus,
  SupportMessageType,
  SupportTicketPriority,
  SupportTicketSource,
  SupportTicketStatus,
};
