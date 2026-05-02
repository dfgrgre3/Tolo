export type AIMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface AIMessage {
  id: string;
  conversationId: string;
  role: AIMessageRole;
  content: string;
  tokensUsed?: number;
  metadata?: any; // JSON object for additional data
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  summary?: string;
  isActive: boolean;
  messages?: AIMessage[];
  createdAt: Date | string;
  updatedAt: Date | string;
}
