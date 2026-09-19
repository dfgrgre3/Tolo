/**
 * Auth Domain Public API (P0-11)
 *
 * Single entry point for all authentication features, hooks, domain models,
 * state providers, and components.
 */

export * from "./domain";
export * from "./api";
export * from "./hooks";
export * from "./components";
export { AuthProvider, useAuthContext } from "./state/auth-context";
