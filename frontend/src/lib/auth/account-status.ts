/**
 * Account State Machine — the account lifecycle, kept strictly separate from
 * the authentication state in `contexts/auth-context.tsx`.
 *
 * Why the split
 * -------------
 * `AuthStatus` answers "is there a verifiable session?" (loading /
 * authenticated / anonymous / blocked / unavailable). It says nothing about
 * the account itself, and the two are frequently confused:
 *
 *     authenticated  +  account = suspended
 *
 * is a perfectly valid state — the visitor proved their identity, but the
 * account is not allowed to transact. Collapsing it into `anonymous` (as the
 * old `blocked → absent` mapping did) hides that distinction from every
 * redirect decision in the app.
 *
 * `AccountStatus` answers "what may this account do?" and is derived from the
 * `/auth/me` payload — the backend remains the authority, this is a
 * client-side read model for routing and UX.
 *
 * Lifecycle
 * ---------
 *   GUEST (no user payload at all — not an account state, but the explicit
 *     "there is nothing to derive from" bottom value)
 *   PENDING_EMAIL_VERIFICATION → ACTIVE
 *   PENDING_PHONE_VERIFICATION → ACTIVE (only when the backend explicitly
 *     requires phone verification; see below)
 *   ACTIVE → SUSPENDED (reversible) → ACTIVE
 *   ACTIVE → LOCKED (= backend BANNED, terminal anti-abuse) → support
 *   ACTIVE → PASSWORD_RESET_REQUIRED → ACTIVE (only via explicit backend flag)
 *   any  → DELETION_PENDING → DELETED (terminal; only via explicit flags)
 *
 * Transitions are owned by the backend; the frontend only reads them.
 */

export type AccountStatus =
  | "GUEST"
  | "PENDING_EMAIL_VERIFICATION"
  | "PENDING_PHONE_VERIFICATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "LOCKED"
  | "PASSWORD_RESET_REQUIRED"
  | "DELETION_PENDING"
  | "DELETED";

/**
 * Input shape — the subset of the `/auth/me` payload the derivation reads.
 *
 * The backend currently emits `status` (ACTIVE / INACTIVE / SUSPENDED /
 * BANNED) plus `emailVerified` / `phoneVerified`. The `*Required` / deletion
 * flags do not exist on the wire yet: they are OPTIONAL so today's payloads
 * keep working, and each one lights up exactly one otherwise-unreachable
 * lifecycle state the moment the backend starts sending it — no guessing
 * from `status` alone (in particular, `INACTIVE` is NEVER mapped to a
 * deletion state; see `deriveAccountStatus`).
 */
export interface AccountStatusInput {
  status?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  /** Backend demands a password change before the account may transact. */
  passwordResetRequired?: boolean;
  /** Backend marks the account as scheduled for deletion. */
  deletionPending?: boolean;
  /** Backend marks the account as deleted (terminal). */
  deleted?: boolean;
  /**
   * Backend requires a verified phone before the account may transact.
   * `PENDING_PHONE_VERIFICATION` is reachable ONLY through this flag:
   * `phoneVerified === false` alone never blocks, because no phone
   * verification UI exists yet and gating on the bare flag would strand
   * every user without a verified phone.
   */
  phoneVerificationRequired?: boolean;
  /** Phone number on file (a verification gate needs something to verify). */
  phone?: string | null;
}

/** Normalizes a wire status to upper-case for case-tolerant comparison. */
function normalizeStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toUpperCase();
}

/**
 * Derives the account lifecycle state from the `/auth/me` payload.
 *
 * Precedence (first match wins):
 *   1. No payload → `GUEST`. A guest is NOT "pending email verification":
 *      returning a pending state for `null` misroutes signed-out visitors
 *      into verification screens.
 *   2. Explicit terminal flags (`deleted`, then `deletionPending`) — the
 *      only path to `DELETED` / `DELETION_PENDING`. `INACTIVE` alone says
 *      nothing about deletion.
 *   3. Restriction states (`BANNED` → `LOCKED`, `SUSPENDED`, `INACTIVE` →
 *      `SUSPENDED` as a conservative "may not transact" fallback,
 *      `passwordResetRequired`). Restrictions win over verification: a
 *      suspended account must see the blocked screen, not a verify-email
 *      form that cannot unblock it.
 *   4. Verification gates (`emailVerified`, then opt-in `phone…`).
 *   5. Anything else (including unknown status strings) → `ACTIVE`.
 */
export function deriveAccountStatus(user: AccountStatusInput | null | undefined): AccountStatus {
  if (!user) return "GUEST";

  // 2 — explicit lifecycle flags from the backend. Checked before `status`
  // so a deletion/password signal can never be masked by a stale status.
  if (user.deleted === true) return "DELETED";
  if (user.deletionPending === true) return "DELETION_PENDING";

  const status = normalizeStatus(user.status);

  // 3 — restrictions before verification (see precedence note above).
  switch (status) {
    case "BANNED":
      // The backend's terminal anti-abuse state. Surfaced as LOCKED rather
      // than SUSPENDED so the UI can distinguish "temporary, reversible"
      // from "requires support intervention". LOCKED === backend BANNED;
      // there is no separate backend LOCKED state.
      return "LOCKED";
    case "SUSPENDED":
      return "SUSPENDED";
    case "INACTIVE":
      // Deliberately conservative: INACTIVE proves only "may not transact",
      // never "is being deleted" (the old DELETION_PENDING mapping was a
      // guess). SUSPENDED is the reversible generic-restriction state, so a
      // wrong guess here still routes to support instead of a deletion
      // screen. If the backend later emits deletion signals, the explicit
      // flags in (2) take precedence over this fallback.
      return "SUSPENDED";
    case "PASSWORD_RESET_REQUIRED":
      // Accepted if the backend ever encodes the demand as a status string;
      // the `passwordResetRequired` boolean below is the primary signal.
      return "PASSWORD_RESET_REQUIRED";
    case "DELETED":
      return "DELETED";
    case "DELETION_PENDING":
      return "DELETION_PENDING";
    default:
      break;
  }
  if (user.passwordResetRequired === true) return "PASSWORD_RESET_REQUIRED";

  // 4 — verification gates. Email first: an unverified ACTIVE account is
  // routed to the verification step instead of the dashboard.
  if (!user.emailVerified) return "PENDING_EMAIL_VERIFICATION";
  // Phone gates ONLY behind the explicit backend requirement (see field
  // docs): without it, an unverified/missing phone never blocks.
  if (
    user.phoneVerificationRequired === true &&
    user.phone != null &&
    user.phone !== "" &&
    !user.phoneVerified
  ) {
    return "PENDING_PHONE_VERIFICATION";
  }

  // 5 — ACTIVE, unknown, or empty status: usable account.
  return "ACTIVE";
}

/** The account is allowed to use authenticated surfaces. */
export function isActiveAccount(status: AccountStatus): boolean {
  return status === "ACTIVE";
}

/**
 * The account exists but is not allowed to transact. Distinct from
 * "not authenticated": the visitor has identity, the account is the problem.
 * `GUEST` is NOT restricted — it is not an account at all (use
 * `isGuestAccount` for that case).
 */
export function isRestrictedAccount(status: AccountStatus): boolean {
  return (
    status === "SUSPENDED" ||
    status === "LOCKED" ||
    status === "PASSWORD_RESET_REQUIRED" ||
    status === "DELETION_PENDING" ||
    status === "DELETED"
  );
}

/**
 * The account must complete a verification step before it is usable. Kept
 * separate from `isRestrictedAccount` — pending-verification users should be
 * routed to a verification screen, not a support/suspension screen.
 * `GUEST` is never "pending verification" (that was the old misrouting bug).
 */
export function isPendingVerification(status: AccountStatus): boolean {
  return (
    status === "PENDING_EMAIL_VERIFICATION" || status === "PENDING_PHONE_VERIFICATION"
  );
}

/**
 * No user payload was available to derive from (signed-out visitor).
 * Never treat as pending, restricted, or active — branch on the session
 * (`AuthStatus`) for guests instead.
 */
export function isGuestAccount(status: AccountStatus): boolean {
  return status === "GUEST";
}
