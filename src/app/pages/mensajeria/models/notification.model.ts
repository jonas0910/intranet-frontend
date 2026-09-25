export interface Notification {
  type: string;
  title: string;
  body: string;
  data: NotificationData;
  recipient_id: number;
  created_at: string;
  count?: number;
}

export interface NotificationData {
  message_id?: number;
  conversation_id?: number;
  sender_id?: number;
  sender_name?: string;
  priority?: string;
  is_urgent?: boolean;
  message_type?: string;
  count?: number;
  message_ids?: number[];
}

export interface NotificationPreferences {
  new_message: boolean;
  urgent_message: boolean;
  broadcast_message: boolean;
  conversation_message: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // Format: "HH:mm"
  quiet_hours_end: string;   // Format: "HH:mm"
}

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
  count: number;
  message?: string;
}

export interface NotificationPreferencesResponse {
  success: boolean;
  data: NotificationPreferences;
  message?: string;
}

export interface WebSocketNotification {
  notification: Notification;
  timestamp: string;
}

export interface BrowserNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
}

export interface ToastNotification {
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  persistent?: boolean;
}

// Enums
export enum NotificationType {
  NEW_MESSAGE = 'new_message',
  URGENT_MESSAGE = 'urgent_message',
  BROADCAST_MESSAGE = 'broadcast_message',
  CONVERSATION_MESSAGE = 'conversation_message',
  MESSAGE_READ = 'message_read',
  SYSTEM_NOTIFICATION = 'system_notification'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Type guards
export function isNotification(obj: any): obj is Notification {
  return obj && 
         typeof obj.type === 'string' && 
         typeof obj.title === 'string' && 
         typeof obj.body === 'string' &&
         obj.data &&
         typeof obj.recipient_id === 'number';
}

export function isWebSocketNotification(obj: any): obj is WebSocketNotification {
  return obj && 
         obj.notification && 
         isNotification(obj.notification) &&
         typeof obj.timestamp === 'string';
}

export function hasMessageData(notification: Notification): boolean {
  return !!(notification.data.message_id || notification.data.message_ids);
}

export function isUrgentNotification(notification: Notification): boolean {
  return notification.type === NotificationType.URGENT_MESSAGE || 
         notification.data.is_urgent === true ||
         notification.data.priority === 'urgent';
}

export function isBroadcastNotification(notification: Notification): boolean {
  return notification.type === NotificationType.BROADCAST_MESSAGE ||
         notification.data.message_type === 'broadcast';
}

export function isAggregatedNotification(notification: Notification): boolean {
  return !!(notification.count && notification.count > 1);
}

// Utility functions
export function getNotificationIcon(notification: Notification): string {
  switch (notification.type) {
    case NotificationType.URGENT_MESSAGE:
      return 'fas fa-exclamation-triangle text-danger';
    case NotificationType.BROADCAST_MESSAGE:
      return 'fas fa-bullhorn text-info';
    case NotificationType.CONVERSATION_MESSAGE:
      return 'fas fa-comments text-primary';
    case NotificationType.MESSAGE_READ:
      return 'fas fa-envelope-open text-success';
    case NotificationType.SYSTEM_NOTIFICATION:
      return 'fas fa-cog text-secondary';
    case NotificationType.NEW_MESSAGE:
    default:
      return 'fas fa-envelope text-primary';
  }
}

export function getNotificationColor(notification: Notification): string {
  if (isUrgentNotification(notification)) {
    return 'danger';
  }
  
  if (isBroadcastNotification(notification)) {
    return 'info';
  }
  
  switch (notification.type) {
    case NotificationType.MESSAGE_READ:
      return 'success';
    case NotificationType.SYSTEM_NOTIFICATION:
      return 'secondary';
    default:
      return 'primary';
  }
}

export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'Ahora';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else {
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  }
}

export function shouldShowBrowserNotification(
  notification: Notification, 
  preferences: NotificationPreferences
): boolean {
  // Check if browser notifications are enabled
  if (!preferences.push_notifications) {
    return false;
  }

  // Check if specific notification type is enabled
  const typeKey = notification.type as keyof NotificationPreferences;
  if (preferences[typeKey] === false) {
    return false;
  }

  // Check quiet hours
  if (preferences.quiet_hours_enabled && isInQuietHours(preferences)) {
    // Only show urgent notifications during quiet hours
    return isUrgentNotification(notification);
  }

  return true;
}

export function isInQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quiet_hours_enabled) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const startMinutes = parseTimeString(preferences.quiet_hours_start);
  const endMinutes = parseTimeString(preferences.quiet_hours_end);

  if (startMinutes > endMinutes) {
    // Quiet hours span midnight
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  } else {
    // Quiet hours within same day
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
}

function parseTimeString(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

export function createBrowserNotificationOptions(
  notification: Notification
): BrowserNotificationOptions {
  return {
    title: notification.title,
    body: notification.body,
    icon: '/assets/images/logo.png',
    badge: '/assets/images/badge.png',
    tag: notification.data.message_id?.toString() || 'messaging',
    requireInteraction: isUrgentNotification(notification),
    data: notification.data
  };
}

export function createToastNotification(
  notification: Notification
): ToastNotification {
  let type: 'info' | 'success' | 'warning' | 'error' = 'info';
  
  if (isUrgentNotification(notification)) {
    type = 'error';
  } else if (notification.type === NotificationType.MESSAGE_READ) {
    type = 'success';
  } else if (isBroadcastNotification(notification)) {
    type = 'warning';
  }

  return {
    title: notification.title,
    body: notification.body,
    type: type,
    duration: isUrgentNotification(notification) ? 0 : 5000, // Persistent for urgent
    persistent: isUrgentNotification(notification)
  };
}