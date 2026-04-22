/**
 * Event Bus Types
 */

export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

export interface EventBusInterface {
    on<T = unknown>(event: string, handler: EventHandler<T>): void;
    off<T = unknown>(event: string, handler: EventHandler<T>): void;
    emit<T = unknown>(event: string, data: T): Promise<void>;
    once<T = unknown>(event: string, handler: EventHandler<T>): void;
}

export interface EventMetadata {
    timestamp: Date;
    source?: string;
    userId?: string;
}

export interface EventData<T = unknown> {
    type: string;
    payload: T;
    metadata?: EventMetadata;
}
