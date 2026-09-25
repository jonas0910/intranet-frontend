import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DepartmentInfo {
  department_id: number;
  centro_costo_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class MechanicalDepartmentService {
  private readonly apiUrl = `${environment.apiUrl}/equipo-mecanico`;
  private deptInfo$?: Observable<any>;

  constructor(private http: HttpClient) { }

  getDepartmentInfo(): Observable<any> {
    if (!this.deptInfo$) {
      this.deptInfo$ = this.http.get<any>(`${this.apiUrl}/mi-departamento`).pipe(
        shareReplay(1)
      );
    }
    return this.deptInfo$;
  }
}
