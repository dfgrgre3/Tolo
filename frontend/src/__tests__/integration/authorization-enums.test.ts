import { describe, expect, it } from 'vitest';
import { Entitlement, UserRole } from '@/types/enums';
import { Entitlement as SharedEntitlement, UserRole as SharedUserRole } from '@thanawy/shared/types/enums';

const role: UserRole = UserRole.STUDENT;
const sharedRole: SharedUserRole = SharedUserRole.STUDENT;
const entitlement: Entitlement = Entitlement.PREMIUM;
const sharedEntitlement: SharedEntitlement = SharedEntitlement.PREMIUM;

// Compile-time contract: PREMIUM is an entitlement, never a role.
// @ts-expect-error PREMIUM must not be accepted as a UserRole.
const invalidRole: UserRole = 'PREMIUM';

void role;
void sharedRole;
void entitlement;
void sharedEntitlement;
void invalidRole;

describe('authorization domain enums', () => {
  it('keeps premium access separate from user roles', () => {
    expect(UserRole).not.toHaveProperty('PREMIUM');
    expect(SharedUserRole).not.toHaveProperty('PREMIUM');
    expect(Entitlement.PREMIUM).toBe('PREMIUM');
    expect(SharedEntitlement.PREMIUM).toBe('PREMIUM');
  });
});
