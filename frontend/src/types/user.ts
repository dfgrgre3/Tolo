/**
 * Frontend User type — re-exports the canonical shared model.
 *
 * This used to be a hand-maintained duplicate of `@thanawy/shared/types/user`
 * (SYM-002 in the symbol architecture audit). Two copies of the same
 * backend-synced shape drift silently: a field added on one side and missed
 * on the other becomes a runtime mismatch nobody notices until a component
 * reads `undefined`. Re-exporting keeps a single source of truth while
 * preserving the `@/types/user` import path existing call sites use.
 */
export type { User, UserSummary, UpdateProfilePayload } from '@thanawy/shared/types/user';
