import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, of, tap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  
  // Logs duplicados eliminados - el código normal del interceptor maneja activos-fijos correctamente
  
  // Log de debugging para peticiones de login
  if (req.url.includes('/auth/login')) {
    console.log('🔐 Interceptor: Petición de login detectada', {
      url: req.url,
      method: req.method,
      headers: req.headers.keys(),
    });
  }
  
  // Verificar si el interceptor está habilitado
  if (!isInterceptorEnabled()) {
    console.log('🔌 Interceptor de autenticación DESHABILITADO - pasando request directamente');
    return next(req);
  }
  
  // DEBUG: Capturar TODAS las peticiones para sistemas-integrados (solo en modo debug)
  if (req.url.includes('sistemas-integrados') && typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
    console.log('🚨 INTERCEPTOR: Petición a sistemas-integrados detectada', {
      url: req.url,
      method: req.method,
      body: req.body,
      headers: req.headers.keys().map(key => ({ key, value: req.headers.get(key) }))
    });
  }
  
  // Obtener token del localStorage
  const token = getTokenFromStorage();
  
  // Clonar la request y agregar headers de autorización si hay token
  let authReq = req;
  if (token && shouldAddAuthHeader(req.url)) {
    // PDF y otros binarios: no forzar Accept JSON (Laravel puede negociar mal y el blob llega como JSON de error).
    const acceptHeader = isBackendPdfOrBinaryGet(req.url) ? 'application/pdf, */*;q=0.8' : 'application/json';
    // Para FormData, no establecer Content-Type (dejar que el navegador lo maneje)
    const headers: { [key: string]: string } = {
      'Authorization': `Bearer ${token}`,
      'Accept': acceptHeader
    };
    
    // Solo agregar Content-Type si no es FormData
    if (!(req.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    authReq = req.clone({
      setHeaders: headers
    });
  } else if (shouldAllowRealRequest(req.url)) {
    // Para requests que van al backend pero no necesitan auth, asegurar headers correctos
    const headers: { [key: string]: string } = {
      'Accept': 'application/json'
    };
    
    // Solo agregar Content-Type si no es FormData
    if (!(req.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    authReq = req.clone({
      setHeaders: headers
    });
  }
  
  // Permitir requests a endpoints específicos del backend real
  if (shouldAllowRealRequest(req.url)) {
    // Solo mostrar mensaje en modo debug
    if (typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
      console.log('🌐 Enviando request al backend:', req.url);
    }
    return next(authReq).pipe(
    tap(response => {
      // DEBUG: Capturar respuestas de sistemas-integrados (solo en modo debug)
      if (req.url.includes('sistemas-integrados') && typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
        const httpResponse = response as any;
        console.log('🚨 INTERCEPTOR: Respuesta de sistemas-integrados recibida', {
          url: req.url,
          method: req.method,
          status: httpResponse.status || httpResponse.statusCode || 'unknown',
          statusText: httpResponse.statusText || 'OK',
          response: httpResponse
        });
      }
    }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ HTTP request failed:', error);
        
        // Si es error 401, manejar de manera especial
        if (error.status === 401) {
          if (typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
            console.warn('⚠️ Error 401 - Token inválido o expirado para:', req.url);
          }
        }
        
        // Re-lanzar el error para que lo maneje el servicio
        return throwError(() => error);
      })
    );
  }
  
  // Para requests no permitidas, devolver mock
  // Solo mostrar mensaje en modo debug
  if (typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
    console.log('🔌 Usando mock data para:', req.url);
  }
  
  const mockResponse = {
    success: true,
    message: 'Mock response - request blocked to prevent loops',
    data: getMockDataForUrl(req.url),
    offline: true,
    timestamp: new Date().toISOString()
  };
  
  return of(mockResponse as any);
};

function getTokenFromStorage(): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return localStorage.getItem('token');
    } catch (error) {
      return null;
    }
  }
  return null;
}

/** Peticiones al API Laravel: URL absoluta o prefijo relativo `/api` (proxy en dev). */
function isBackendApiRequest(url: string): boolean {
  const base = environment.apiUrl;
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return url.startsWith(base);
  }
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (url.startsWith(origin + base) || url.startsWith(base)) {
      return true;
    }
  } else if (url.startsWith(base)) {
    return true;
  }
  // Compat: ApiService antiguo u otras llamadas directas a Laravel en :8000
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api(\/|$)/i.test(url)) {
    return true;
  }
  return false;
}

/** GET que espera PDF u otro binario (responseType blob en el cliente). */
function isBackendPdfOrBinaryGet(url: string): boolean {
  if (!isBackendApiRequest(url)) {
    return false;
  }
  const u = url.toLowerCase();
  return (
    u.includes('/ficha-pdf') ||
    u.includes('/plan-mantenimiento-pdf') ||
    /\/valorizaciones\/\d+\/pdf/i.test(u) ||
    u.endsWith('/pdf') ||
    u.includes('/pdf?')
  );
}

function shouldAddAuthHeader(url: string): boolean {
  // No agregar auth header a login ni a endpoints públicos
  const publicEndpoints = [
    '/auth/login',
    '/menus/public',
    '/chat/canales'  // Canal público, no requiere auth
  ];

  const isBackendCall = isBackendApiRequest(url);
  const isPublic = publicEndpoints.some(endpoint => url.includes(endpoint)) || url.includes('/public/');
  return isBackendCall && !isPublic;
}

function shouldAllowRealRequest(url: string): boolean {
  return isBackendApiRequest(url);
}

function getMockDataForUrl(url: string): any {
  // Formularios de gestión de usuarios (admin): misma forma que UsuariosController::usersReferenceData
  if (url.includes('users-reference-data')) {
    return {
      roles: [
        { id: 1, name: 'Super Admin', description: 'Super Admin' },
        { id: 2, name: 'Admin', description: 'Admin' },
      ],
      permissions: [],
      systems: [],
      menus: [],
      departments: [
        { id: 1, nombre: 'Departamento (mock)' },
      ],
      cost_centers: [],
    };
  }

  // Auth endpoints
  if (url.includes('/auth/login')) {
    return {
      user: {
        id: 1,
        name: 'Usuario Demo',
        email: 'demo@municipio.gov',
        empleado: {
          id: 1,
          nombres: 'Usuario',
          apellidos: 'Demo',
          cargo: 'Administrador',
          foto: 'assets/img/user1-128x128.jpg'
        }
      },
      token: 'mock-token-offline',
      token_type: 'Bearer'
    };
  }
  
  // Roles endpoints
  if (url.includes('/roles')) {
    return [
      {
        id: 1,
        name: 'Super Admin',
        description: 'Administrador principal del sistema',
        permissions: [
          { id: 1, name: 'admin.menus', description: 'Administrar menús' },
          { id: 2, name: 'admin.roles', description: 'Administrar roles' },
          { id: 3, name: 'admin.usuarios', description: 'Administrar usuarios' }
        ],
        users_count: 1,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Admin',
        description: 'Administrador del sistema',
        permissions: [
          { id: 1, name: 'admin.menus', description: 'Administrar menús' },
          { id: 2, name: 'admin.roles', description: 'Administrar roles' }
        ],
        users_count: 2,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];
  }
  
  // Menu permissions endpoints
  if (url.includes('/menu-permissions')) {
    return [
      {
        id: 1,
        menu_id: 1,
        role_id: 1,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        menu_id: 2,
        role_id: 1,
        can_view: true,
        can_create: false,
        can_edit: false,
        can_delete: false,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];
  }
  
  if (url.includes('/auth/validate-token')) {
    return {
      valid: true,
      user: {
        id: 1,
        name: 'Usuario Demo',
        email: 'demo@municipio.gov'
      }
    };
  }
  
  // Dashboard endpoints
  if (url.includes('dashboard/stats')) {
    return {
      totalUsuarios: 150,
      usuariosActivos: 120,
      documentosSubidos: 45,
      sistemasConectados: 8,
      ticketsPendientes: 12,
      comunicadosNuevos: 3
    };
  }
  
  if (url.includes('sistemas-externos/activos')) {
    return [
      { 
        id: 1, 
        nombre: 'Sistema ERP (Offline)', 
        codigo: 'erp', 
        icono: 'fas fa-chart-bar',
        activo: true,
        offline: true
      },
      { 
        id: 2, 
        nombre: 'RRHH (Offline)', 
        codigo: 'rrhh', 
        icono: 'fas fa-users',
        activo: true,
        offline: true
      }
    ];
  }
  
  if (url.includes('comunicados')) {
    return [
      {
        id: 1,
        titulo: '🎉 Sistema Sin Bucles Funcionando',
        contenido: 'El sistema está funcionando perfectamente en modo offline, sin bucles infinitos con el backend.',
        fecha: new Date().toISOString(),
        tipo: 'success',
        autor: 'Sistema Anti-Bucles',
        importante: true
      },
      {
        id: 2,
        titulo: '🔒 Modo Offline Activado',
        contenido: 'Todas las comunicaciones HTTP han sido bloqueadas para evitar bucles. El sistema funciona con datos mock.',
        fecha: new Date().toISOString(),
        tipo: 'info',
        autor: 'Sistema de Seguridad',
        importante: false
      }
    ];
  }
  
  if (url.includes('tickets')) {
    return [
      {
        id: 1,
        numero_ticket: 'TK-OFFLINE-001',
        titulo: 'Sistema funcionando sin bucles',
        estado: 'resuelto',
        prioridad: 'alta',
        descripcion: 'Bucles infinitos eliminados exitosamente'
      }
    ];
  }
  
  if (url.includes('chat')) {
    return [
      {
        id: 1,
        usuario: 'Sistema Anti-Bucles',
        mensaje: '✅ No más bucles infinitos! Sistema funcionando correctamente.',
        fecha: new Date().toISOString(),
        avatar: 'assets/img/user1-128x128.jpg'
      }
    ];
  }
  
  // Module Discovery endpoints
  if (url.includes('/module-discovery')) {
    return [
      {
        name: 'planillas',
        path: '/Modules/Planillas',
        display_name: 'Sistema de Planillas',
        description: 'Módulo para gestión de planillas y nómina',
        version: '1.0.0',
        status: 'active',
        routes: {
          api: [
            { method: 'GET', path: '/api/planillas/employees' },
            { method: 'POST', path: '/api/planillas/employees' }
          ],
          web: [
            { method: 'GET', path: '/planillas/dashboard' }
          ]
        },
        menus: [
          { nombre: 'Dashboard', ruta: '/planillas/dashboard', icono: 'fas fa-chart-pie' },
          { nombre: 'Empleados', ruta: '/planillas/empleados', icono: 'fas fa-users' }
        ],
        controllers: [
          { name: 'EmployeeController.php', path: '/Modules/Planillas/app/Http/Controllers', size: 1024, modified: new Date().toISOString() }
        ],
        models: [
          { name: 'Employee.php', path: '/Modules/Planillas/app/Models', size: 512, modified: new Date().toISOString() }
        ],
        migrations: [
          { name: 'create_employees_table.php', path: '/Modules/Planillas/database/migrations', size: 256, modified: new Date().toISOString() }
        ],
        has_menu_config: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  // System Management endpoints
  if (url.includes('/system-management')) {
    if (url.includes('/systems')) {
      return [
        {
          id: 1,
          nombre: 'Sistema de Planillas',
          codigo: 'PLANILLAS',
          descripcion: 'Sistema integrado para gestión de planillas',
          url_base: '/planillas',
          activo: true,
          sso_habilitado: false,
          sso_force: false,
          menus_count: 5,
          active_menus_count: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
    
    if (url.includes('/roles-permissions')) {
      return {
        roles: [
          {
            id: 1,
            name: 'Super Admin',
            guard_name: 'web',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            name: 'Admin',
            guard_name: 'web',
            created_at: new Date().toISOString()
          }
        ],
        permissions: [
          {
            id: 1,
            name: 'admin.menus',
            guard_name: 'web',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            name: 'admin.roles',
            guard_name: 'web',
            created_at: new Date().toISOString()
          }
        ]
      };
    }
  }


  // Default mock data
  return {
    message: 'Datos mock generados automáticamente',
    url: url,
    timestamp: new Date().toISOString(),
    offline: true,
    status: 'mock_success'
  };
}

/**
 * Verifica si el interceptor de autenticación está habilitado
 * En desarrollo: habilitado por defecto para SaaS
 * En producción: siempre habilitado
 */
function isInterceptorEnabled(): boolean {
  // En producción (o SSR), siempre habilitado
  if (typeof window === 'undefined') {
    return true;
  }
  
  // Verificar si estamos en modo desarrollo
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('dev') ||
                       window.location.port === '4200' ||
                       window.location.port === '8001';
  
  // En desarrollo, verificar parámetros de URL
  if (isDevelopment) {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Si se especifica explícitamente disable-interceptor=true, deshabilitar
    if (urlParams.get('disable-interceptor') === 'true') {
      return false;
    }
    
    // Si se especifica explícitamente enable-interceptor=true, habilitar
    if (urlParams.get('enable-interceptor') === 'true') {
      return true;
    }
    
    // Por defecto en desarrollo, HABILITADO para SaaS
    return true;
  }
  
  // En producción, siempre habilitado
  return true;
}