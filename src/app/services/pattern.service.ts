import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';

// Interfaces para los patrones de diseño (dinámicos vía API)
export interface SistemaPattern {
  id: string;           // ID del backend (numérico como string) para API
  nombre: string;
  codigo: string;
  descripcion: string;
  categoria: string;
  prioridad: 'alta' | 'media' | 'baja';
  estado_default: boolean;
  keywords?: string[];
  sso_config: {
    habilitado: boolean;
    force: boolean;
    provider: 'saml2' | 'oauth2' | 'basic';
  };
  menus: MenuPattern[];
  configuracion: {
    url_base: string;
    timeout: number;
    retry_attempts: number;
    cache_enabled: boolean;
  };
}

export interface MenuPattern {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  icono: string;
  orden: number;
  estado_default: boolean;
  keywords?: string[];
  permisos_requeridos: string[];
  submenus?: SubMenuPattern[];
}

export interface SubMenuPattern {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string;
  icono?: string;
  permisos: string[];
}

export interface PatternMetadata {
  total_patterns: number;
  categorias: string[];
  prioridades: string[];
  providers_sso: string[];
  iconos_disponibles: string[];
}

export interface PatternFile {
  version: string;
  description: string;
  last_updated: string;
  patterns: { [key: string]: SistemaPattern };
  metadata: PatternMetadata;
}

/** Convierte patrón del frontend al payload que espera el backend */
function toBackendPayload(patron: SistemaPattern): any {
  return {
    nombre: patron.nombre,
    codigo: patron.codigo,
    descripcion: patron.descripcion,
    categoria: patron.categoria,
    prioridad: patron.prioridad,
    estado_default: patron.estado_default ?? true,
    keywords: patron.keywords || [],
    sso_config: patron.sso_config,
    configuracion: patron.configuracion,
    activo: true,
    menus: (patron.menus || []).map(m => ({
      nombre: m.nombre,
      codigo: m.codigo,
      descripcion: m.descripcion || '',
      icono: m.icono,
      orden: m.orden,
      estado_default: m.estado_default,
      keywords: m.keywords || [],
      permisos_requeridos: m.permisos_requeridos || [],
      activo: true,
      submenus: (m.submenus || []).map(s => ({
        nombre: s.nombre,
        codigo: s.codigo,
        descripcion: s.descripcion || '',
        icono: s.icono || '',
        permisos: s.permisos || [],
        activo: true
      }))
    }))
  };
}

/** Convierte un patrón de la API al formato frontend */
function fromBackendPatron(patron: any): SistemaPattern {
  const menus = (patron.menus || []).map((m: any) => ({
    id: String(m.id),
    nombre: m.nombre,
    codigo: m.codigo,
    descripcion: m.descripcion || '',
    icono: m.icono || 'far fa-circle',
    orden: m.orden ?? 0,
    estado_default: m.estado_default ?? true,
    keywords: m.keywords || [],
    permisos_requeridos: m.permisos_requeridos || [],
    submenus: (m.submenus || []).map((s: any) => ({
      id: String(s.id),
      nombre: s.nombre,
      codigo: s.codigo,
      descripcion: s.descripcion || '',
      icono: s.icono || '',
      permisos: s.permisos || []
    }))
  }));

  return {
    id: String(patron.id),
    nombre: patron.nombre,
    codigo: patron.codigo,
    descripcion: patron.descripcion || '',
    categoria: patron.categoria,
    prioridad: patron.prioridad,
    estado_default: patron.estado_default ?? true,
    keywords: patron.keywords || [],
    sso_config: patron.sso_config || { habilitado: false, force: false, provider: 'basic' },
    menus,
    configuracion: patron.configuracion || { url_base: '', timeout: 30000, retry_attempts: 3, cache_enabled: true }
  };
}

@Injectable({
  providedIn: 'root'
})
export class PatternService {
  private patterns: PatternFile | null = null;

  constructor(private api: ApiService) {}

  /**
   * Cargar patrones de diseño desde la API (dinámico)
   */
  loadPatterns(): Observable<PatternFile> {
    if (this.patterns) {
      return of(this.patterns);
    }
    return this.api.get<SistemaPattern[]>('sistema-patrones').pipe(
      map(response => {
        const data = response.data || [];
        const patterns: { [key: string]: SistemaPattern } = {};
        data.forEach((patron: any) => {
          const p = fromBackendPatron(patron);
          patterns[p.id] = p;
        });
        const patternFile: PatternFile = {
          version: '1.0',
          description: 'Patrones cargados dinámicamente desde la API',
          last_updated: new Date().toISOString(),
          patterns,
          metadata: {
            total_patterns: Object.keys(patterns).length,
            categorias: Array.from(new Set(data.map((x: any) => x.categoria))),
            prioridades: ['alta', 'media', 'baja'],
            providers_sso: ['saml2', 'oauth2', 'basic'],
            iconos_disponibles: ['fas fa-home', 'fas fa-users', 'fas fa-chart-bar', 'fas fa-cog']
          }
        };
        this.patterns = patternFile;
        return patternFile;
      }),
      tap(() => console.log('✅ PatternService: Patrones cargados dinámicamente'))
    );
  }

  /**
   * Obtener todos los patrones desde la API (dinámico)
   */
  getAllPatterns(): Observable<SistemaPattern[]> {
    return this.api.get<any[]>('sistema-patrones').pipe(
      map(response => (response.data || []).map((p: any) => fromBackendPatron(p))),
      tap(list => console.log(`✅ PatternService: ${list.length} patrones cargados`)),
      catchError(err => {
        console.error('❌ PatternService.getAllPatterns:', err);
        throw err;
      })
    );
  }

  /**
   * Obtener un patrón por ID (id numérico del backend)
   */
  getPatternById(id: string): Observable<SistemaPattern | null> {
    return this.api.get<any>('sistema-patrones/' + id).pipe(
      map(response => response.data ? fromBackendPatron(response.data) : null),
      catchError(() => this.getAllPatterns().pipe(
        map(patterns => patterns.find(p => p.id === id || p.codigo === id) || null)
      ))
    );
  }

  /**
   * Obtener patrones por categoría
   */
  getPatternsByCategory(categoria: string): Observable<SistemaPattern[]> {
    return this.getAllPatterns().pipe(
      map(patterns => patterns.filter(p => p.categoria === categoria))
    );
  }

  /**
   * Obtener patrones por prioridad
   */
  getPatternsByPriority(prioridad: 'alta' | 'media' | 'baja'): Observable<SistemaPattern[]> {
    return this.getAllPatterns().pipe(
      map(patterns => patterns.filter(p => p.prioridad === prioridad))
    );
  }

  /**
   * Obtener patrones con SSO habilitado
   */
  getPatternsWithSSO(): Observable<SistemaPattern[]> {
    return this.getAllPatterns().pipe(
      map(patterns => patterns.filter(p => p.sso_config?.habilitado))
    );
  }

  /**
   * Obtener metadatos de los patrones
   */
  getPatternMetadata(): Observable<PatternMetadata> {
    return this.loadPatterns().pipe(
      map(patterns => patterns.metadata)
    );
  }

  /**
   * Obtener categorías disponibles
   */
  getAvailableCategories(): Observable<string[]> {
    return this.getPatternMetadata().pipe(
      map(metadata => metadata.categorias)
    );
  }

  /**
   * Obtener prioridades disponibles
   */
  getAvailablePriorities(): Observable<string[]> {
    return this.getPatternMetadata().pipe(
      map(metadata => metadata.prioridades)
    );
  }

  /**
   * Obtener providers SSO disponibles
   */
  getAvailableSSOProviders(): Observable<string[]> {
    return this.getPatternMetadata().pipe(
      map(metadata => metadata.providers_sso)
    );
  }

  /**
   * Obtener iconos disponibles
   */
  getAvailableIcons(): Observable<string[]> {
    return this.getPatternMetadata().pipe(
      map(metadata => metadata.iconos_disponibles)
    );
  }

  /**
   * Buscar patrones por texto
   */
  searchPatterns(searchTerm: string): Observable<SistemaPattern[]> {
    const term = searchTerm.toLowerCase();
    return this.getAllPatterns().pipe(
      map(patterns => patterns.filter(pattern => 
        pattern.nombre.toLowerCase().includes(term) ||
        pattern.descripcion.toLowerCase().includes(term) ||
        pattern.codigo.toLowerCase().includes(term) ||
        pattern.categoria.toLowerCase().includes(term)
      ))
    );
  }

  /**
   * Obtener patrones activos por defecto
   */
  getDefaultActivePatterns(): Observable<SistemaPattern[]> {
    return this.getAllPatterns().pipe(
      map(patterns => patterns.filter(p => p.estado_default))
    );
  }

  /**
   * Obtener menús activos por defecto de un patrón
   */
  getDefaultActiveMenus(patternId: string): Observable<MenuPattern[]> {
    return this.getPatternById(patternId).pipe(
      map(pattern => pattern?.menus.filter(m => m.estado_default) || [])
    );
  }

  /**
   * Validar si un patrón existe
   */
  patternExists(id: string): Observable<boolean> {
    return this.getPatternById(id).pipe(
      map(pattern => pattern !== null)
    );
  }

  /**
   * Obtener estadísticas de patrones
   */
  getPatternStats(): Observable<{
    total: number;
    porCategoria: { [key: string]: number };
    porPrioridad: { [key: string]: number };
    conSSO: number;
    sinSSO: number;
  }> {
    return this.getAllPatterns().pipe(
      map(patterns => {
        const stats = {
          total: patterns.length,
          porCategoria: {} as { [key: string]: number },
          porPrioridad: {} as { [key: string]: number },
          conSSO: patterns.filter(p => p.sso_config?.habilitado).length,
          sinSSO: patterns.filter(p => !p.sso_config?.habilitado).length
        };

        // Contar por categoría
        patterns.forEach(pattern => {
          stats.porCategoria[pattern.categoria] = (stats.porCategoria[pattern.categoria] || 0) + 1;
        });

        // Contar por prioridad
        patterns.forEach(pattern => {
          stats.porPrioridad[pattern.prioridad] = (stats.porPrioridad[pattern.prioridad] || 0) + 1;
        });

        return stats;
      })
    );
  }

  /**
   * Limpiar cache de patrones (para reflejar cambios dinámicos)
   */
  clearCache(): void {
    this.patterns = null;
    console.log('🗑️ Cache de patrones limpiado');
  }

  /**
   * Recargar patrones desde la API
   */
  reloadPatterns(): Observable<PatternFile> {
    this.clearCache();
    return this.loadPatterns();
  }

  /**
   * Crear un nuevo patrón en la API (dinámico)
   */
  savePattern(pattern: SistemaPattern): Observable<SistemaPattern> {
    const body = toBackendPayload(pattern);
    return this.api.post<SistemaPattern>('sistema-patrones', body).pipe(
      map(response => {
        const created = response.data ? fromBackendPatron(response.data) : pattern;
        this.clearCache();
        return created;
      }),
      tap(p => console.log('✅ Patrón creado dinámicamente:', p.codigo))
    );
  }

  /**
   * Actualizar un patrón existente en la API (dinámico)
   */
  updatePattern(patternId: string, pattern: SistemaPattern): Observable<SistemaPattern> {
    const body = toBackendPayload(pattern);
    return this.api.put<SistemaPattern>('sistema-patrones/' + patternId, body).pipe(
      map(response => {
        const updated = response.data ? fromBackendPatron(response.data) : pattern;
        this.clearCache();
        return updated;
      }),
      tap(p => console.log('✅ Patrón actualizado dinámicamente:', p.codigo))
    );
  }

  /**
   * Eliminar un patrón en la API (dinámico)
   */
  deletePattern(patternId: string): Observable<boolean> {
    return this.api.delete<void>('sistema-patrones/' + patternId).pipe(
      map(response => response.success),
      tap(() => this.clearCache()),
      tap(() => console.log('✅ Patrón eliminado dinámicamente:', patternId))
    );
  }
}
