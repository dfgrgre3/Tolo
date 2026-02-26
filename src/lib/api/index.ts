/**
 * Central export point for all API clients
 * 
 * Use `apiClient` (default from api-client) for any new feature.
 * Use the named functions from auth-client for auth-specific operations.
 */
export { default as apiClient } from './api-client';
export * from './api-client';
export * from './auth-client';
export * from './gamification-client';
