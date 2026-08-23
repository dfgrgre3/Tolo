/**
 * Session management hooks — split into `use-admin-sessions` (the security
 * dashboard's view across every user) and `use-my-sessions` (the signed-in
 * user's own device list). This file re-exports both so existing imports of
 * `@/hooks/use-session-management` keep working unchanged.
 */
export {
  useSessionManagement,
  useSessionActivity,
  type DeviceInfo,
  type DeviceType,
  type SessionStatus,
  type SessionStats,
} from "./use-admin-sessions";

export { useMySessions } from "./use-my-sessions";
