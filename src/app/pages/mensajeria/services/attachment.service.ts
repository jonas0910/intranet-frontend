import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AttachmentService {
  private baseUrl = `${environment.apiUrl}/mensajeria/attachments`;

  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post(`${this.baseUrl}/upload`, formData);
  }

  downloadFile(attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${attachmentId}/download`, {
      responseType: 'blob'
    });
  }

  deleteFile(attachmentId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${attachmentId}`);
  }
}