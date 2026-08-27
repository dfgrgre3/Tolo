"use client";

import ChangePasswordCard from "./ChangePasswordCard";
import MfaSettingsCard from "./MfaSettingsCard";
import SocialAccountsCard from "./SocialAccountsCard";
import ConnectedDevicesCard from "./ConnectedDevicesCard";
import DangerZoneSection from "./DangerZoneSection";

/** Security tab shell (10.11) — composes password, MFA, linked accounts, and danger zone. */
export default function SecuritySettings() {
  return (
    <div className="space-y-6">
      <ChangePasswordCard />
      <MfaSettingsCard />
      <SocialAccountsCard />
      <ConnectedDevicesCard />
      <DangerZoneSection />
    </div>
  );
}
