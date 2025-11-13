type EventHandler = (payload: Record<string, unknown>) => Promise<void> | void;

export type { EventHandler };
