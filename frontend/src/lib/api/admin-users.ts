import { apiClient } from './api-client';
import { apiRoutes } from './routes';

interface SendActivationLinkResponse {
  success: boolean;
  message?: string;
}

export async function sendUserActivationLink(userId: string): Promise<SendActivationLinkResponse> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new Error('A user ID is required to send an activation link.');
  }

  return apiClient.postJson<SendActivationLinkResponse>(
    apiRoutes.admin.sendActivationLink(normalizedUserId),
    {},
  );
}