import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  department?: string;
  role?: string;
  is_active?: boolean;
}

export interface UserResponse {
  success: boolean;
  data: User[];
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = `${environment.apiUrl}/users-for-messaging`;

  constructor(private http: HttpClient) {}

  /**
   * Get all users
   */
  getUsers(): Observable<User[]> {
    return this.http.get<UserResponse>(this.baseUrl)
      .pipe(
        map(response => {
          if (response.success && Array.isArray(response.data)) {
            return response.data;
          }
          throw new Error('Failed to load users - invalid response structure');
        }),
        catchError(error => {
          console.error('Error loading users:', error);
          return of([]);
        })
      );
  }

  /**
   * Get users by department
   */
  getUsersByDepartment(departmentId: number): Observable<User[]> {
    const params = { department_id: departmentId.toString() };

    return this.http.get<UserResponse>(this.baseUrl, { params })
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error('Failed to load department users');
        }),
        catchError(error => {
          console.error('Error loading department users:', error);
          return of([]);
        })
      );
  }

  /**
   * Search users by name or email
   */
  searchUsers(query: string): Observable<User[]> {
    const params = { search: query };

    return this.http.get<UserResponse>(this.baseUrl, { params })
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error('Failed to search users');
        }),
        catchError(error => {
          console.error('Error searching users:', error);
          return of([]);
        })
      );
  }

  /**
   * Get user by ID
   */
  getUserById(id: number): Observable<User | null> {
    return this.http.get<{success: boolean, data: User}>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error loading user:', error);
          return of(null);
        })
      );
  }

  /**
   * Get current user
   */
  getCurrentUser(): Observable<User | null> {
    return this.http.get<{success: boolean, data: User}>(`${this.baseUrl}/me`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error loading current user:', error);
          return of(null);
        })
      );
  }


  /**
   * Get departments
   */
  getDepartments(): Observable<any[]> {
    return this.http.get<{success: boolean, data: any[]}>(`${environment.apiUrl}/departamentos`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error loading departments:', error);
          return of([]);
        })
      );
  }

  /**
   * Get user avatar URL
   */
  getUserAvatar(user: User): string {
    if (user.avatar) {
      return user.avatar;
    }
    
    // Generate avatar based on user initials
    const initials = user.name
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
    
    // Use a service like Gravatar or generate a colored avatar
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=007bff&color=fff&size=40`;
  }

  /**
   * Format user display name
   */
  formatUserDisplay(user: User): string {
    return user.name || user.email;
  }

  /**
   * Check if user has permission
   */
  hasPermission(user: User, permission: string): boolean {
    // This would normally check against user roles/permissions
    // For now, return true for admin and manager roles
    return user.role === 'admin' || user.role === 'manager';
  }

  /**
   * Check if user can send messages
   */
  canSendMessages(user: User): boolean {
    return Boolean(user.is_active) && this.hasPermission(user, 'messaging.send');
  }

  /**
   * Check if user can receive messages
   */
  canReceiveMessages(user: User): boolean {
    return Boolean(user.is_active) && this.hasPermission(user, 'messaging.read');
  }
}
