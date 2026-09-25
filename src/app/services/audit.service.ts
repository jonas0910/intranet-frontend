import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  module: string;
  description: string;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failed';
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface AuditStats {
  total_actions: number;
  active_users: number;
  failed_actions: number;
  security_alerts: number;
  actions_by_type: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private apiUrl = environment.apiUrl;

  private readonly STORAGE_KEY = 'audit_system_logs';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene los logs de auditoría con filtros
   * Estrategia: Intenta backend, si falla (404/Offline), usa LocalStorage
   */
  getLogs(filters: any = {}): Observable<any> {
    // URL del backend
    let baseUrl = environment.apiUrl;
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.substring(0, baseUrl.length - 4);
    }
    const logsUrl = `${baseUrl}/api/accesos-usuarios/logs`;
    
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<any>(logsUrl, { params }).pipe(
      map(response => {
        // Normalizar la respuesta del backend
        if (response.success && response.data) {
          return {
            data: response.data,
            total: response.total || response.data.length,
            current_page: response.current_page || 1,
            last_page: response.last_page || 1
          };
        }
        return response;
      }),
      catchError(error => {
        console.warn('Backend audit logs not available (404/Error). Using LocalStorage fallback.', error);
        // Fallback a LocalStorage persistente
        return of(this.getLocalLogs(filters));
      })
    );
  }

  /**
   * Crea un nuevo registro de auditoría
   */
  createLog(logData: any): Observable<any> {
    // 1. Guardar siempre en LocalStorage primero (garantía de persistencia)
    this.saveToLocalLog(logData);

    // 2. Intentar guardar en backend
    let baseUrl = environment.apiUrl;
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.substring(0, baseUrl.length - 4);
    }
    const logsUrl = `${baseUrl}/api/accesos-usuarios/logs`;
    
    return this.http.post<any>(logsUrl, logData).pipe(
      catchError(error => {
        // Si falla el backend, no rompemos el flujo, ya se guardó en local
        return of({ success: true, data: logData, source: 'local' });
      })
    );
  }

  /**
   * Obtiene estadísticas generales
   */
  getStats(): Observable<AuditStats> {
    // Opción segura para la URL base
    let baseUrl = environment.apiUrl;
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.substring(0, baseUrl.length - 4);
    }
    
    // Intentar usar endpoint de estadísticas de usuario si existe
    // o devolver vacío si no hay endpoint específico de auditoría
    return this.http.get<any>(`${baseUrl}/api/accesos-usuarios/estadisticas`).pipe(
      // Mapear la respuesta al formato AuditStats si es posible
      map(response => {
        const data = response.data || {};
        return {
          total_actions: data.total_accesses || 0,
          active_users: data.active_accesses || 0,
          failed_actions: 0, // No disponible en este endpoint
          security_alerts: 0, // No disponible
          actions_by_type: {} // No disponible
        };
      }),
      catchError(error => {
        console.warn('Backend audit stats not available (404/Error). Using LocalStorage fallback.', error);
        
        // Calcular estadísticas basadas en los logs locales
        const localLogs = this.getLocalLogs({});
        const logs = localLogs.data || [];
        const uniqueUsers = new Set(logs.map((l: AuditLog) => l.user_id)).size;
        const failedActions = logs.filter((l: AuditLog) => l.status === 'failed').length;
        
        // Contar acciones por tipo
        const actionsByType: {[key: string]: number} = {};
        logs.forEach((l: AuditLog) => {
          actionsByType[l.action] = (actionsByType[l.action] || 0) + 1;
        });

        return of({
          total_actions: logs.length,
          active_users: uniqueUsers,
          failed_actions: failedActions,
          security_alerts: 0,
          actions_by_type: actionsByType
        });
      })
    );
  }

  /**
   * Exporta logs a CSV/Excel
   */
  exportLogs(filters: any = {}): Observable<Blob> {
    // Simulación de descarga
    return this.http.get(`${this.apiUrl}/export`, { responseType: 'blob' });
  }
    // --- LOCAL STORAGE HELPERS ---

  private getLocalLogs(filters: any): any {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      let logs: AuditLog[] = raw ? JSON.parse(raw) : [];
      
      // Aplicar filtros básicos en memoria
      if (filters.user) {
        logs = logs.filter(l => l.user?.name.toLowerCase().includes(filters.user.toLowerCase()));
      }
      if (filters.module) {
        logs = logs.filter(l => l.module === filters.module);
      }
      if (filters.action) {
        logs = logs.filter(l => l.action === filters.action);
      }
      
      // Ordenar por fecha descendente
      logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return {
        data: logs,
        total: logs.length,
        current_page: 1,
        last_page: 1
      };
    } catch (e) {
      return { data: [], total: 0 };
    }
  }

  private saveToLocalLog(logData: any): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const logs: AuditLog[] = raw ? JSON.parse(raw) : [];
      
      // Completar datos faltantes para el log local
      const newLog: AuditLog = {
        id: Date.now(), // ID temporal basado en timestamp
        user_id: logData.user_id || 0,
        action: logData.action,
        module: logData.module,
        description: logData.description,
        ip_address: logData.ip_address || '127.0.0.1',
        user_agent: logData.user_agent || navigator.userAgent,
        status: logData.status || 'success',
        created_at: new Date().toISOString(),
        user: {
          id: logData.user_id || 0,
          name: 'Usuario Actual', // En una app real, obtener del AuthService
          email: 'usuario@sistema.com',
          role: 'Usuario'
        }
      };

      logs.unshift(newLog); // Agregar al inicio
      
      // Limitar a los últimos 100 logs para no saturar localStorage
      if (logs.length > 100) {
        logs.length = 100;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Error saving to LocalStorage audit log', e);
    }
  }

  /**
   * Helper para registrar una acción común
   */
  logAction(action: string, module: string, description: string, status: 'success' | 'failed' = 'success', userId?: number): void {
    const logData = {
      user_id: userId,
      action,
      module,
      description,
      status,
      ip_address: '127.0.0.1', // El backend debería sobrescribir esto
      user_agent: navigator.userAgent
    };
    
    this.createLog(logData).subscribe({
      next: () => console.log(`Audit: ${action} logged successfully`),
      error: (err) => console.warn(`Audit: Failed to log ${action}`, err)
    });
  }

  // --- MOCK DATA GENERATOR ---
  private generateMockLogs(filters: any): any {
    const actions = ['Login', 'Logout', 'Crear', 'Actualizar', 'Eliminar', 'Exportar'];
    const modules = ['Usuarios', 'Roles', 'Planillas', 'Documentos', 'Configuración'];
    const statuses: ('success' | 'failed')[] = ['success', 'success', 'success', 'failed'];
    
    const logs: AuditLog[] = Array.from({ length: 20 }, (_, i) => {
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      const randomModule = modules[Math.floor(Math.random() * modules.length)];
      
      return {
        id: 1000 + i,
        user_id: Math.floor(Math.random() * 10) + 1,
        action: randomAction,
        module: randomModule,
        description: `${randomAction} en el módulo ${randomModule}`,
        ip_address: `192.168.1.${100 + i}`,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        status: statuses[Math.floor(Math.random() * statuses.length)],
        created_at: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString(),
        user: {
          id: Math.floor(Math.random() * 10) + 1,
          name: `Usuario ${i + 1}`,
          email: `usuario${i + 1}@example.com`,
          role: i % 3 === 0 ? 'Admin' : 'User'
        }
      };
    });

    return {
      data: logs,
      total: 100,
      current_page: 1,
      last_page: 5
    };
  }
}
