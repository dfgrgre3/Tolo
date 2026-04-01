-- Hot-path indexes for auth, sessions, notifications, messaging, billing.
CREATE INDEX "User_emailVerificationToken_idx" ON "User"("emailVerificationToken");
CREATE INDEX "User_resetToken_idx" ON "User"("resetToken");
CREATE INDEX "User_magicLinkToken_idx" ON "User"("magicLinkToken");
CREATE INDEX "User_phoneVerificationOTP_idx" ON "User"("phoneVerificationOTP");
CREATE INDEX "User_referralCode_idx" ON "User"("referralCode");

CREATE INDEX "Session_userId_isActive_expiresAt_idx" ON "Session"("userId", "isActive", "expiresAt" DESC);
CREATE INDEX "Session_isActive_expiresAt_idx" ON "Session"("isActive", "expiresAt");

CREATE INDEX "Notification_userId_isDeleted_createdAt_idx" ON "Notification"("userId", "isDeleted", "createdAt" DESC);

CREATE INDEX "Message_senderId_receiverId_createdAt_idx" ON "Message"("senderId", "receiverId", "createdAt" DESC);
CREATE INDEX "Message_receiverId_isRead_createdAt_idx" ON "Message"("receiverId", "isRead", "createdAt" DESC);

CREATE INDEX "Subscription_userId_status_endDate_idx" ON "Subscription"("userId", "status", "endDate" DESC);
CREATE INDEX "Subscription_status_gracePeriodEndDate_idx" ON "Subscription"("status", "gracePeriodEndDate");

CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt" DESC);
CREATE INDEX "Payment_subscriptionId_status_createdAt_idx" ON "Payment"("subscriptionId", "status", "createdAt" DESC);
