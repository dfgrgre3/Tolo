"use client";

import ChangePasswordCard from "./ChangePasswordCard";
import MfaSettingsCard from "./MfaSettingsCard";
import SocialAccountsCard from "./SocialAccountsCard";
import ConnectedDevicesCard from "./ConnectedDevicesCard";
import DangerZoneSection from "./DangerZoneSection";
import PhoneVerificationCard from "./PhoneVerificationCard";
import EmailChangeCard from "./EmailChangeCard";
import SecurityAuditLogCard from "./SecurityAuditLogCard";

/** Security tab shell (10.11) — composes password, MFA, linked accounts, and danger zone. */
export default function SecuritySettings() {
  return (
    <div className="space-y-6">
      <ChangePasswordCard />
      <PhoneVerificationCard />
      <EmailChangeCard />
      <MfaSettingsCard />
      <SocialAccountsCard />
      <ConnectedDevicesCard />
      <SecurityAuditLogCard />
      <DangerZoneSection />
    </div>
  );
}
