export interface User {
  id: number;
  name: string;
  email: string;
  department_id?: number;
  department?: {
    id: number;
    name: string;
  };
}

export interface Attachment {
  id: number;
  original_name: string;
  file_size: number;
  human_file_size: string;
  mime_type: string;
  is_scanned: boolean;
  scan_result: 'clean' | 'infected' | 'suspicious' | null;
  is_safe: boolean;
  can_preview: boolean;
  is_image: boolean;
  icon_class: string;
  download_url: string;
  preview_url?: string;
  thumbnail_url?: string;
}

export interface MessageRecipient {
  id: number;
  recipient_id: number;
  recipient_type: 'user' | 'department';
  read_at: string | null;
  folder: string;
  recipient: User;
}

export interface Message {
  id: number;
  conversation_id?: number;
  subject?: string;
  content: string;
  priority: 'normal' | 'high' | 'urgent';
  message_type: 'individual' | 'broadcast' | 'system';
  parent_message_id?: number;
  created_at: string;
  updated_at: string;
  
  // Relationships
  sender: User;
  recipients?: MessageRecipient[];
  attachments?: Attachment[];
  conversation?: {
    id: number;
    title?: string;
    conversation_type: string;
  };
  parent_message?: {
    id: number;
    subject?: string;
    content: string;
    sender: User;
  };
  
  // Computed properties
  replies_count?: number;
  is_read: boolean;
  is_urgent: boolean;
  is_broadcast: boolean;
  is_reply: boolean;
  has_attachments: boolean;
  recipient_count: number;
  unread_count: number;
}

export interface MessageThread {
  root_message: Message;
  replies: Message[];
  total_count: number;
}

export interface MessageListItem {
  id: number;
  subject?: string;
  content: string;
  priority: 'normal' | 'high' | 'urgent';
  message_type: 'individual' | 'broadcast' | 'system';
  created_at: string;
  conversation_id?: number; // Add conversation_id

  sender: User;
  read_at: string | null;
  folder: string;
  is_read: boolean;
  is_urgent: boolean;
  is_broadcast: boolean;
  has_attachments: boolean;
  attachments_count: number;
  replies_count: number;
  canal_id?: number; // For real-time chat
}

export interface SendMessageRequest {
  conversation_id?: number;
  subject?: string;
  content: string;
  priority?: 'normal' | 'high' | 'urgent';
  message_type?: 'individual' | 'broadcast' | 'system';
  parent_message_id?: number;
  recipients: MessageRecipientRequest[];
  attachments?: File[];
}

export interface MessageRecipientRequest {
  id: number;
  type: 'user' | 'department';
}

export interface MessageFilters {
  folder?: string;
  unread_only?: boolean;
  priority?: 'normal' | 'high' | 'urgent';
  search?: string;
  sender_id?: number;
  date_from?: string;
  date_to?: string;
  has_attachments?: boolean;
}

export interface MessageResponse {
  success: boolean;
  data: {
    data: MessageListItem[];
    meta: PaginationMeta;
  };
  folder_stats?: FolderStats;
  unread_count?: number;
  message?: string;
}

export interface PaginationMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

export interface FolderStats {
  [folder: string]: {
    count: number;
    unread_count: number;
  };
}

export interface MessageAction {
  action: 'mark_read' | 'mark_unread' | 'move_to_folder' | 'delete' | 'reply' | 'forward';
  messages: Message[] | MessageListItem[];
  folder?: string;
}

export interface MessageStatistics {
  total_messages: number;
  by_priority: {
    [priority: string]: {
      priority: string;
      count: number;
    };
  };
  by_type: {
    [type: string]: {
      message_type: string;
      count: number;
    };
  };
  by_date: Array<{
    date: string;
    count: number;
  }>;
  most_active_users: Array<{
    sender_id: number;
    message_count: number;
    sender: User;
  }>;
  average_response_time: Array<{
    conversation_id: number;
    avg_response_minutes: number;
  }>;
}

// Enums for better type safety
export enum MessagePriority {
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum MessageType {
  INDIVIDUAL = 'individual',
  BROADCAST = 'broadcast',
  SYSTEM = 'system'
}

export enum MessageFolder {
  INBOX = 'inbox',
  SENT = 'sent',
  DRAFTS = 'drafts',
  TRASH = 'trash',
  ARCHIVE = 'archive'
}

export enum RecipientType {
  USER = 'user',
  DEPARTMENT = 'department'
}

// Type guards
export function isMessage(obj: any): obj is Message {
  return obj && typeof obj.id === 'number' && typeof obj.content === 'string';
}

export function isMessageListItem(obj: any): obj is MessageListItem {
  return obj && typeof obj.id === 'number' && typeof obj.content === 'string' && obj.sender;
}

export function hasAttachments(message: Message | MessageListItem): boolean {
  return Boolean(message.has_attachments) || Boolean('attachments' in message && message.attachments && message.attachments.length > 0);
}

export function isUrgent(message: Message | MessageListItem): boolean {
  return message.priority === MessagePriority.URGENT || message.is_urgent;
}

export function isBroadcast(message: Message | MessageListItem): boolean {
  return message.message_type === MessageType.BROADCAST || message.is_broadcast;
}

export function isUnread(message: MessageListItem): boolean {
  return !message.is_read || message.read_at === null;
}