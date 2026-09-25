export interface Contact {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  department?: string;
  position?: string;
  is_online: boolean;
  is_active: boolean;
  last_seen?: string;
  unread_count: number;
  last_message?: string;
  last_message_time?: string;
  role: string;
  status: 'active' | 'inactive' | 'busy' | 'away';
  joined_at: string;
}

export interface ContactStatus {
  status: 'online' | 'offline' | 'away' | 'busy';
  last_seen: string;
}

export interface ContactListFilters {
  status?: 'online' | 'active' | 'inactive' | 'all';
  department?: string;
  role?: string;
  search?: string;
  sort?: 'name' | 'last_seen' | 'department' | 'role';
  order?: 'asc' | 'desc';
}

