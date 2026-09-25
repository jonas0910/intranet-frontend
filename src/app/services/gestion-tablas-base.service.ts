import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export class GestionTablasBaseService<T> {
  /** Caché de getAll() para evitar peticiones repetidas; se invalida en create/update/delete */
  private getAllCache$: Observable<ApiResponse<T[]>> | null = null;

  constructor(
    protected http: HttpClient,
    protected endpoint: string
  ) {}

  getAll(): Observable<ApiResponse<T[]>> {
    if (this.getAllCache$) {
      return this.getAllCache$;
    }
    const url = `${environment.apiUrl}${this.endpoint}`;
    this.getAllCache$ = this.http.get<ApiResponse<T[]>>(url).pipe(
      shareReplay(1)
    );
    return this.getAllCache$;
  }

  private invalidateGetAllCache(): void {
    this.getAllCache$ = null;
  }

  getById(id: number): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${environment.apiUrl}${this.endpoint}/${id}`);
  }

  create(data: Partial<T>): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${environment.apiUrl}${this.endpoint}`, data).pipe(
      tap(() => this.invalidateGetAllCache())
    );
  }

  update(id: number, data: Partial<T>): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${environment.apiUrl}${this.endpoint}/${id}`, data).pipe(
      tap(() => this.invalidateGetAllCache())
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${environment.apiUrl}${this.endpoint}/${id}`).pipe(
      tap(() => this.invalidateGetAllCache())
    );
  }
}

