/**
 * Event Bus Types
 */

export type EventHandler<T = any> = (data: T) => void | Promise<void>;

export interface EventBusInterface {
  on<T = any>(event: string, handler: EventHandler<T>): void;
  off<T = any>(event: string, handler: EventHandler<T>): void;
  emit<T = any>(event: string, data: T): Promise<void>;
  once<T = any>(event: string, handler: EventHandler<T>): void;
}

export interface EventMetadata {
  timestamp: Date;
  source?: string;
  userId?: string;
}

export interface EventData<T = any> {
  type: string;
  payload: T;
  metadata?: EventMetadata;
}
