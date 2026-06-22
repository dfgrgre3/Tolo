/**
 * Centralized auth module — single import point for all auth utilities.
 */

// Roles
export * from './roles';

// Permissions
export * from './permissions';

// Session (Zustand Store / Persistence / Cookies)
export * from './session';

// Authorization checks (canAccess, hasRole, hasPermission)
export * from './authorization';

