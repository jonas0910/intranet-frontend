import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface DatabaseStatus {
  connected: boolean;
  message: string;
  lastCheck: Date;
  tables: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseConfigService {
  private baseUrl = `${environment.apiUrl}/database`;
  private statusSubject = new BehaviorSubject<DatabaseStatus>({
    connected: false,
    message: 'Checking connection...',
    lastCheck: new Date(),
    tables: []
  });
  
  public status$ = this.statusSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkConnection();
  }

  /**
   * Check database connection status
   */
  checkConnection(): Observable<DatabaseStatus> {
    return this.http.get<DatabaseStatus>(`${this.baseUrl}/status`)
      .pipe(
        map(status => {
          const updatedStatus = {
            ...status,
            lastCheck: new Date()
          };
          this.statusSubject.next(updatedStatus);
          return updatedStatus;
        }),
        catchError(error => {
          const errorStatus: DatabaseStatus = {
            connected: false,
            message: `Connection failed: ${error.message}`,
            lastCheck: new Date(),
            tables: []
          };
          this.statusSubject.next(errorStatus);
          return [errorStatus];
        })
      );
  }

  /**
   * Run database migrations
   */
  runMigrations(): Observable<any> {
    return this.http.post(`${this.baseUrl}/migrate`, {})
      .pipe(
        map(response => {
          console.log('Migrations completed successfully');
          return response;
        }),
        catchError(error => {
          console.error('Migration failed:', error);
          throw error;
        })
      );
  }

  /**
   * Seed database with initial data
   */
  seedDatabase(): Observable<any> {
    return this.http.post(`${this.baseUrl}/seed`, {})
      .pipe(
        map(response => {
          console.log('Database seeded successfully');
          return response;
        }),
        catchError(error => {
          console.error('Seeding failed:', error);
          throw error;
        })
      );
  }

  /**
   * Get database statistics
   */
  getStatistics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/statistics`)
      .pipe(
        catchError(error => {
          console.error('Error getting database statistics:', error);
          throw error;
        })
      );
  }

  /**
   * Test messaging system tables
   */
  testMessagingTables(): Observable<any> {
    return this.http.get(`${this.baseUrl}/test-messaging-tables`)
      .pipe(
        map(response => {
          console.log('Messaging tables test passed');
          return response;
        }),
        catchError(error => {
          console.error('Messaging tables test failed:', error);
          throw error;
        })
      );
  }

  /**
   * Get current status
   */
  getCurrentStatus(): DatabaseStatus {
    return this.statusSubject.value;
  }

  /**
   * Create sample data for testing
   */
  createSampleData(): Observable<any> {
    return this.http.post(`${this.baseUrl}/create-sample-data`, {})
      .pipe(
        map(response => {
          console.log('Sample data created successfully');
          return response;
        }),
        catchError(error => {
          console.error('Sample data creation failed:', error);
          throw error;
        })
      );
  }

  /**
   * Check if database is ready for messaging
   */
  isMessagingReady(): Observable<boolean> {
    return this.testMessagingTables()
      .pipe(
        map(() => true),
        catchError(() => [false])
      );
  }
}
