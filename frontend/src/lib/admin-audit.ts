type AdminAction = "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "PUBLISH" | "UNPUBLISH" | "LOGIN" | "LOGOUT";

interface AuditLogEntry {
  action: AdminAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

const AUDIT_LOG_KEY = "admin_audit_log";
const MAX_LOG_ENTRIES = 500;

function getAuditLogs(): AuditLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(AUDIT_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveAuditLogs(logs: AuditLogEntry[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = logs.slice(-MAX_LOG_ENTRIES);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable
  }
}

export function logAdminAction(
  action: AdminAction,
  entityType: string,
  options?: {
    entityId?: string;
    entityName?: string;
    details?: Record<string, unknown>;
  }
) {
  const entry: AuditLogEntry = {
    action,
    entityType,
    entityId: options?.entityId,
    entityName: options?.entityName,
    details: options?.details,
    timestamp: new Date().toISOString(),
  };

  const logs = getAuditLogs();
  logs.push(entry);
  saveAuditLogs(logs);
}

export function getRecentAuditLogs(limit: number = 50): AuditLogEntry[] {
  const logs = getAuditLogs();
  return logs.slice(-limit).reverse();
}

export function clearAuditLogs() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUDIT_LOG_KEY);
  }
}
