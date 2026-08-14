import type {ImageAttachment} from './attachment.js';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  tone?: 'error';
  attachments?: readonly ImageAttachment[];
  createdAt: Date;
}
