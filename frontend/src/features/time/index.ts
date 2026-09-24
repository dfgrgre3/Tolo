/**
 * Public API of the time feature. Domain engines are pure and UI-agnostic;
 * adapters/hooks that bind them to the dashboard live under
 * `app/(dashboard)/time/`.
 */
export * as timeDomain from "./domain";
export * as timeAdapters from "./adapters";
