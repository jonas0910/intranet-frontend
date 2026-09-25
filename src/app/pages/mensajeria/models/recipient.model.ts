import { User } from './message.model';

export interface Recipient {
  id: number;
  type: 'user' | 'department';
  name: string;
  email?: string;
  department?: string;
  user_count?: number; // For departments
}

export interface RecipientSearchResult {
  users: RecipientUser[];
  departments: RecipientDepartment[];
}

export interface RecipientUser {
  id: number;
  type: 'user';
  name: string;
  email: string;
  department?: string;
}

export interface RecipientDepartment {
  id: number;
  type: 'department';
  name: string;
  user_count: number;
}

export interface RecipientValidationResult {
  valid_recipients: Recipient[];
  errors: Array<{
    index: number;
    recipient: Recipient;
    error: string;
  }>;
  is_valid: boolean;
}

export interface RecipientResponse {
  success: boolean;
  data: {
    users: RecipientUser[];
    departments: RecipientDepartment[];
  };
  message?: string;
}

export interface RecipientSearchResponse {
  success: boolean;
  data: RecipientSearchResult;
  query: string;
  message?: string;
}

export interface RecipientValidationResponse {
  success: boolean;
  data: RecipientValidationResult;
  message?: string;
}

// Enums
export enum RecipientType {
  USER = 'user',
  DEPARTMENT = 'department'
}

// Type guards
export function isRecipient(obj: any): obj is Recipient {
  return obj && 
         typeof obj.id === 'number' && 
         typeof obj.type === 'string' &&
         ['user', 'department'].includes(obj.type) &&
         typeof obj.name === 'string';
}

export function isRecipientUser(obj: any): obj is RecipientUser {
  return isRecipient(obj) && 
         obj.type === RecipientType.USER &&
         typeof obj.email === 'string';
}

export function isRecipientDepartment(obj: any): obj is RecipientDepartment {
  return isRecipient(obj) && 
         obj.type === RecipientType.DEPARTMENT &&
         typeof obj.user_count === 'number';
}

// Utility functions
export function createRecipientFromUser(user: User): RecipientUser {
  return {
    id: user.id,
    type: RecipientType.USER,
    name: user.name,
    email: user.email,
    department: user.department?.name
  };
}

export function createRecipientFromDepartment(department: any): RecipientDepartment {
  return {
    id: department.id,
    type: RecipientType.DEPARTMENT,
    name: department.name,
    user_count: department.users_count || department.user_count || 0
  };
}

export function getRecipientDisplayName(recipient: Recipient): string {
  if (isRecipientUser(recipient)) {
    return recipient.name;
  }
  
  if (isRecipientDepartment(recipient)) {
    return `${recipient.name} (${recipient.user_count} usuarios)`;
  }
  
  return recipient.name;
}

export function getRecipientIcon(recipient: Recipient): string {
  if (isRecipientUser(recipient)) {
    return 'fas fa-user';
  }
  
  if (isRecipientDepartment(recipient)) {
    return 'fas fa-building';
  }
  
  return 'fas fa-question-circle';
}

export function getRecipientColor(recipient: Recipient): string {
  if (isRecipientUser(recipient)) {
    return 'primary';
  }
  
  if (isRecipientDepartment(recipient)) {
    return 'info';
  }
  
  return 'secondary';
}

export function formatRecipientList(recipients: Recipient[]): string {
  if (recipients.length === 0) {
    return 'Sin destinatarios';
  }
  
  if (recipients.length === 1) {
    return getRecipientDisplayName(recipients[0]);
  }
  
  if (recipients.length <= 3) {
    return recipients.map(r => getRecipientDisplayName(r)).join(', ');
  }
  
  const first = getRecipientDisplayName(recipients[0]);
  const remaining = recipients.length - 1;
  return `${first} y ${remaining} más`;
}

export function validateRecipientList(recipients: Recipient[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (recipients.length === 0) {
    errors.push('Debe seleccionar al menos un destinatario');
  }
  
  if (recipients.length > 100) {
    errors.push('Máximo 100 destinatarios por mensaje');
  }
  
  // Check for duplicates
  const seen = new Set<string>();
  recipients.forEach((recipient, index) => {
    const key = `${recipient.type}:${recipient.id}`;
    if (seen.has(key)) {
      errors.push(`Destinatario duplicado: ${getRecipientDisplayName(recipient)}`);
    }
    seen.add(key);
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function filterRecipients(recipients: Recipient[], searchTerm: string): Recipient[] {
  if (!searchTerm.trim()) {
    return recipients;
  }
  
  const term = searchTerm.toLowerCase();
  
  return recipients.filter(recipient => {
    const name = recipient.name.toLowerCase();
    const email = isRecipientUser(recipient) ? recipient.email.toLowerCase() : '';
    const department = recipient.department?.toLowerCase() || '';
    
    return name.includes(term) || email.includes(term) || department.includes(term);
  });
}

export function sortRecipients(recipients: Recipient[]): Recipient[] {
  return [...recipients].sort((a, b) => {
    // Sort by type first (users before departments)
    if (a.type !== b.type) {
      return a.type === RecipientType.USER ? -1 : 1;
    }
    
    // Then sort by name
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });
}

export function groupRecipientsByType(recipients: Recipient[]): {
  users: RecipientUser[];
  departments: RecipientDepartment[];
} {
  const users: RecipientUser[] = [];
  const departments: RecipientDepartment[] = [];
  
  recipients.forEach(recipient => {
    if (isRecipientUser(recipient)) {
      users.push(recipient);
    } else if (isRecipientDepartment(recipient)) {
      departments.push(recipient);
    }
  });
  
  return { users, departments };
}

export function getTotalRecipientCount(recipients: Recipient[]): number {
  return recipients.reduce((total, recipient) => {
    if (isRecipientUser(recipient)) {
      return total + 1;
    } else if (isRecipientDepartment(recipient)) {
      return total + recipient.user_count;
    }
    return total;
  }, 0);
}

export function createRecipientRequest(recipient: Recipient): number {
  return recipient.id;
}

export function createRecipientsRequest(recipients: Recipient[]): number[] {
  return recipients.map(createRecipientRequest);
}

export function parseRecipientFromString(input: string): Recipient | null {
  // Try to parse email format: "Name <email@domain.com>"
  const emailMatch = input.match(/^(.+?)\s*<(.+@.+)>$/);
  if (emailMatch) {
    return {
      id: 0, // Will be resolved by search
      type: RecipientType.USER,
      name: emailMatch[1].trim(),
      email: emailMatch[2].trim()
    };
  }
  
  // Try to parse just email: "email@domain.com"
  const emailOnlyMatch = input.match(/^.+@.+$/);
  if (emailOnlyMatch) {
    return {
      id: 0, // Will be resolved by search
      type: RecipientType.USER,
      name: input,
      email: input
    };
  }
  
  // Otherwise treat as name
  return {
    id: 0, // Will be resolved by search
    type: RecipientType.USER,
    name: input
  };
}