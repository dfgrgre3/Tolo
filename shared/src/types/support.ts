/**
 * Support & Help Center — shared domain contracts (Phase 1 foundation).
 * Frontend-only scaffolding. No backend changes. No fake APIs.
 * Backend remains authoritative for auth, RBAC, tickets, storage.
 */

export enum SupportTicketStatus {
  NEW = 'NEW',
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_USER = 'WAITING_FOR_USER',
  WAITING_FOR_INTERNAL = 'WAITING_FOR_INTERNAL',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
  CANCELLED = 'CANCELLED',
  DUPLICATE = 'DUPLICATE',
  MERGED = 'MERGED',
}

export enum SupportTicketPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

export enum SupportTicketSource {
  HELP_CENTER = 'HELP_CENTER',
  CONTACT_FORM = 'CONTACT_FORM',
  BUG_REPORT = 'BUG_REPORT',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  AI_HANDOFF = 'AI_HANDOFF',
  EMAIL = 'EMAIL',
  ADMIN = 'ADMIN',
}

export enum SupportMessageType {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
  INTERNAL_NOTE = 'INTERNAL_NOTE',
  SYSTEM = 'SYSTEM',
}

export enum SupportArticleStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum SupportFeatureRequestStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PLANNED = 'PLANNED',
  IN_DEVELOPMENT = 'IN_DEVELOPMENT',
  RELEASED = 'RELEASED',
  DECLINED = 'DECLINED',
  ARCHIVED = 'ARCHIVED',
}

export enum SupportIncidentStatus {
  INVESTIGATING = 'INVESTIGATING',
  IDENTIFIED = 'IDENTIFIED',
  MONITORING = 'MONITORING',
  RESOLVED = 'RESOLVED',
}

export enum SupportServiceStatus {
  OPERATIONAL = 'OPERATIONAL',
  DEGRADED = 'DEGRADED',
  PARTIAL_OUTAGE = 'PARTIAL_OUTAGE',
  MAJOR_OUTAGE = 'MAJOR_OUTAGE',
  MAINTENANCE = 'MAINTENANCE',
}

/** Customer-visible ticket transitions. Server must enforce. */
export const CUSTOMER_ALLOWED_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  [SupportTicketStatus.NEW]: [],
  [SupportTicketStatus.OPEN]: [SupportTicketStatus.CLOSED],
  [SupportTicketStatus.WAITING_FOR_USER]: [SupportTicketStatus.OPEN, SupportTicketStatus.CLOSED],
  [SupportTicketStatus.RESOLVED]: [SupportTicketStatus.REOPENED],
  [SupportTicketStatus.CLOSED]: [SupportTicketStatus.REOPENED],
};

/** Granular permission names — must be mapped to backend RBAC in Phase 2. */
export const SUPPORT_PERMISSIONS = [
  'support.ticket.create',
  'support.ticket.read.own',
  'support.ticket.read.assigned',
  'support.ticket.read.all',
  'support.ticket.reply',
  'support.ticket.internal_note',
  'support.ticket.assign',
  'support.ticket.reassign',
  'support.ticket.escalate',
  'support.ticket.merge',
  'support.ticket.close',
  'support.ticket.reopen',
  'support.article.create',
  'support.article.edit',
  'support.article.publish',
  'support.article.delete',
  'support.analytics.read',
  'support.audit.read',
  'support.configuration.manage',
  'support.incident.manage',
] as const;
export type SupportPermission = (typeof SUPPORT_PERMISSIONS)[number];

/** Support notification events (Phase 2 wiring). */
export const SUPPORT_NOTIFICATION_EVENTS = [
  'support.ticket.created',
  'support.ticket.replied',
  'support.ticket.assigned',
  'support.ticket.escalated',
  'support.ticket.resolved',
  'support.ticket.reopened',
  'support.ticket.closed',
  'support.sla.at_risk',
  'support.sla.breached',
  'support.incident.created',
  'support.incident.updated',
] as const;
export type SupportNotificationEvent = (typeof SUPPORT_NOTIFICATION_EVENTS)[number];

export interface SupportTicketDraft {
  categoryId?: string;
  subcategoryId?: string;
  subject: string;
  description: string;
  priority?: SupportTicketPriority;
  relatedCourseId?: string;
  relatedOrderId?: string;
}

export interface SupportBugReportDraft extends SupportTicketDraft {
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  browser?: string;
  os?: string;
  device?: string;
  url?: string;
  correlationId?: string;
}

export interface SupportFeatureRequestDraft {
  title: string;
  description: string;
  useCase: string;
  category?: string;
}
