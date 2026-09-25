import { User } from './message.model';

export interface ConversationParticipant {
  id: number;
  name: string;
  email: string;
  role: 'participant' | 'moderator' | 'admin';
  joined_at: string;
  left_at?: string;
  is_active: boolean;
}

export interface Conversation {
  id: number;
  title?: string;
  conversation_type: 'individual' | 'group' | 'department';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Relationships
  creator: User;
  participants?: ConversationParticipant[];
  active_participants?: ConversationParticipant[];
  latest_message?: {
    id: number;
    content: string;
    created_at: string;
    sender: User;
  };
  
  // Counts
  participant_count: number;
  message_count: number;
  unread_count?: number;
  
  // User-specific information
  user_role?: 'participant' | 'moderator' | 'admin';
  user_joined_at?: string;
  can_manage: boolean;
  
  // Type flags
  is_individual: boolean;
  is_group: boolean;
  is_department: boolean;
}

export interface ConversationListItem {
  id: number;
  title?: string;
  conversation_type: 'individual' | 'group' | 'department';
  is_active: boolean;
  created_at: string;
  
  creator: User;
  latest_message?: {
    id: number;
    content: string;
    created_at: string;
    sender: User;
  };
  participants_preview: Array<{
    id: number;
    name: string;
  }>;
  
  participant_count: number;
  unread_count: number;
  user_role?: string;
  
  is_individual: boolean;
  is_group: boolean;
  is_department: boolean;
  has_unread: boolean;
}

export interface CreateConversationRequest {
  title?: string;
  type: 'individual' | 'group' | 'department';
  participants: number[];
  department_id?: number;
}

export interface ConversationFilters {
  type?: 'individual' | 'group' | 'department';
  active_only?: boolean;
  with_unread?: boolean;
  search?: string;
}

export interface ConversationResponse {
  success: boolean;
  data: {
    data: ConversationListItem[];
    meta: {
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number;
      to: number;
    };
  };
  message?: string;
}

export interface ConversationDetailResponse {
  success: boolean;
  data: Conversation;
  message?: string;
}

export interface ConversationMessagesResponse {
  success: boolean;
  data: {
    data: any[]; // Messages in conversation format
    meta: {
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
      from: number;
      to: number;
    };
  };
  conversation: Conversation;
}

export interface ConversationStatistics {
  total: number;
  by_type: {
    individual: number;
    group: number;
    department: number;
  };
  active: number;
  with_recent_activity: number;
  inactive: number;
  most_active: Array<{
    id: number;
    title?: string;
    conversation_type: string;
    messages_count: number;
  }>;
}

export interface ParticipantAction {
  action: 'add' | 'remove' | 'change_role' | 'leave';
  user_id?: number;
  role?: 'participant' | 'moderator' | 'admin';
}

// Enums
export enum ConversationType {
  INDIVIDUAL = 'individual',
  GROUP = 'group',
  DEPARTMENT = 'department'
}

export enum ParticipantRole {
  PARTICIPANT = 'participant',
  MODERATOR = 'moderator',
  ADMIN = 'admin'
}

// Type guards
export function isConversation(obj: any): obj is Conversation {
  return obj && typeof obj.id === 'number' && typeof obj.conversation_type === 'string';
}

export function isConversationListItem(obj: any): obj is ConversationListItem {
  return obj && typeof obj.id === 'number' && typeof obj.conversation_type === 'string' && obj.creator;
}

export function isIndividualConversation(conversation: Conversation | ConversationListItem): boolean {
  return conversation.conversation_type === ConversationType.INDIVIDUAL || conversation.is_individual;
}

export function isGroupConversation(conversation: Conversation | ConversationListItem): boolean {
  return conversation.conversation_type === ConversationType.GROUP || conversation.is_group;
}

export function isDepartmentConversation(conversation: Conversation | ConversationListItem): boolean {
  return conversation.conversation_type === ConversationType.DEPARTMENT || conversation.is_department;
}

export function hasUnreadMessages(conversation: ConversationListItem): boolean {
  return conversation.has_unread || (conversation.unread_count ? conversation.unread_count > 0 : false);
}

export function canManageConversation(conversation: Conversation, userId: number): boolean {
  return Boolean(conversation.can_manage) || 
         conversation.creator.id === userId || 
         Boolean(conversation.user_role && ['admin', 'moderator'].includes(conversation.user_role));
}

export function isParticipantPrivileged(participant: ConversationParticipant): boolean {
  return participant.role === ParticipantRole.ADMIN || participant.role === ParticipantRole.MODERATOR;
}

export function getConversationDisplayName(conversation: Conversation | ConversationListItem): string {
  if (conversation.title) {
    return conversation.title;
  }
  
  if (isIndividualConversation(conversation)) {
    // For individual conversations, show the other participant's name
    if ('participants_preview' in conversation) {
      const otherParticipant = conversation.participants_preview.find(p => p.id !== getCurrentUserId());
      return otherParticipant?.name || 'Conversación Individual';
    }
    return 'Conversación Individual';
  }
  
  if (isGroupConversation(conversation)) {
    return `Grupo (${conversation.participant_count} miembros)`;
  }
  
  if (isDepartmentConversation(conversation)) {
    return `Departamento (${conversation.participant_count} miembros)`;
  }
  
  return 'Conversación';
}

export function getConversationIcon(conversation: Conversation | ConversationListItem): string {
  if (isIndividualConversation(conversation)) {
    return 'fas fa-user';
  }
  
  if (isGroupConversation(conversation)) {
    return 'fas fa-users';
  }
  
  if (isDepartmentConversation(conversation)) {
    return 'fas fa-building';
  }
  
  return 'fas fa-comments';
}

// Helper function to get current user ID (this should be implemented based on your auth system)
function getCurrentUserId(): number {
  // This should return the current user's ID from your auth service
  // For now, returning 0 as placeholder
  return 0;
}