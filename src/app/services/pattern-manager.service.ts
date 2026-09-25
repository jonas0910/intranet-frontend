import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PatternService, SistemaPattern } from './pattern.service';
import { NotificationService } from './notification.service';

export interface PatternImportResult {
  success: boolean;
  pattern?: SistemaPattern;
  error?: string;
  warnings?: string[];
}

export interface PatternExportOptions {
  includeMetadata?: boolean;
  format?: 'json' | 'yaml';
  pretty?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PatternManagerService {
  
  constructor(
    private patternService: PatternService,
    private notificationService: NotificationService
  ) {}

  /**
   * Exportar un patrón como archivo JSON
   */
  exportPattern(pattern: SistemaPattern, options: PatternExportOptions = {}): void {
    try {
      let exportData: any = pattern;
      
      // Incluir metadatos si se solicita
      if (options.includeMetadata) {
        exportData = {
          metadata: {
            exported_at: new Date().toISOString(),
            version: '1.0.0',
            source: 'intranet-patterns'
          },
          pattern: pattern
        };
      }

      // Formatear datos
      const dataStr = options.pretty !== false 
        ? JSON.stringify(exportData, null, 2)
        : JSON.stringify(exportData);

      // Crear y descargar archivo
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `patron_${pattern.id}_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      this.notificationService.success(`Patrón "${pattern.nombre}" exportado correctamente`);
    } catch (error) {
      console.error('Error al exportar patrón:', error);
      this.notificationService.error('Error al exportar el patrón');
    }
  }

  /**
   * Importar un patrón desde archivo JSON
   */
  importPattern(file: File): Observable<PatternImportResult> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const content = e.target.result;
          const data = JSON.parse(content);
          
          // Validar estructura del archivo
          const validationResult = this.validateImportData(data);
          
          if (!validationResult.isValid) {
            observer.next({
              success: false,
              error: validationResult.error
            });
            observer.complete();
            return;
          }

          // Extraer el patrón
          const pattern = data.pattern || data;
          
          // Validar que el patrón no exista
          this.patternService.patternExists(pattern.id).subscribe({
            next: (exists) => {
              if (exists) {
                observer.next({
                  success: false,
                  error: `Ya existe un patrón con el ID "${pattern.id}"`
                });
              } else {
                observer.next({
                  success: true,
                  pattern: pattern,
                  warnings: validationResult.warnings
                });
              }
              observer.complete();
            },
            error: () => {
              observer.next({
                success: true,
                pattern: pattern,
                warnings: validationResult.warnings
              });
              observer.complete();
            }
          });

        } catch (error) {
          observer.next({
            success: false,
            error: 'Error al parsear el archivo JSON'
          });
          observer.complete();
        }
      };

      reader.onerror = () => {
        observer.next({
          success: false,
          error: 'Error al leer el archivo'
        });
        observer.complete();
      };

      reader.readAsText(file);
    });
  }

  /**
   * Validar datos de importación
   */
  private validateImportData(data: any): { isValid: boolean; error?: string; warnings?: string[] } {
    const warnings: string[] = [];
    
    // Verificar estructura básica
    if (!data) {
      return { isValid: false, error: 'Archivo vacío o inválido' };
    }

    // Extraer el patrón
    const pattern = data.pattern || data;
    
    // Validar campos requeridos
    const requiredFields = ['id', 'nombre', 'codigo', 'descripcion', 'categoria', 'prioridad'];
    for (const field of requiredFields) {
      if (!pattern[field]) {
        return { isValid: false, error: `Campo requerido faltante: ${field}` };
      }
    }

    // Validar ID
    if (!/^[a-z0-9_]+$/.test(pattern.id)) {
      return { isValid: false, error: 'ID debe contener solo letras minúsculas, números y guiones bajos' };
    }

    // Validar código
    if (pattern.codigo.length > 10) {
      warnings.push('Código muy largo, se recomienda máximo 6 caracteres');
    }

    // Validar URL base
    if (pattern.configuracion?.url_base && !pattern.configuracion.url_base.startsWith('http')) {
      warnings.push('URL base debe comenzar con http:// o https://');
    }

    // Validar menús
    if (pattern.menus && Array.isArray(pattern.menus)) {
      for (let i = 0; i < pattern.menus.length; i++) {
        const menu = pattern.menus[i];
        if (!menu.id || !menu.nombre) {
          return { isValid: false, error: `Menú ${i + 1} debe tener ID y nombre` };
        }
      }
    }

    return { isValid: true, warnings: warnings.length > 0 ? warnings : undefined };
  }

  /**
   * Crear un nuevo patrón basado en una plantilla
   */
  createPatternFromTemplate(templateType: string): SistemaPattern {
    const templates: { [key: string]: SistemaPattern } = {
      'rrhh': {
        id: 'sistema_rrhh',
        nombre: 'Sistema de Recursos Humanos',
        codigo: 'RRHH',
        descripcion: 'Gestión integral de recursos humanos, empleados, nóminas y capacitación',
        categoria: 'gestión_interna',
        prioridad: 'alta',
        estado_default: true,
        sso_config: {
          habilitado: true,
          force: false,
          provider: 'saml2'
        },
        menus: [
          {
            id: 'menu_empleados',
            nombre: 'Gestión de Empleados',
            codigo: 'empleados',
            descripcion: 'Administración de información de empleados',
            icono: 'fas fa-users',
            orden: 1,
            estado_default: true,
            permisos_requeridos: ['rrhh.empleados.read', 'rrhh.empleados.write'],
            submenus: []
          }
        ],
        configuracion: {
          url_base: 'https://rrhh.empresa.com',
          timeout: 30000,
          retry_attempts: 3,
          cache_enabled: true
        }
      },
      'contabilidad': {
        id: 'sistema_contabilidad',
        nombre: 'Sistema de Contabilidad',
        codigo: 'CONTAB',
        descripcion: 'Gestión contable, financiera y de reportes',
        categoria: 'finanzas',
        prioridad: 'alta',
        estado_default: true,
        sso_config: {
          habilitado: true,
          force: true,
          provider: 'oauth2'
        },
        menus: [
          {
            id: 'menu_facturacion',
            nombre: 'Facturación',
            codigo: 'facturacion',
            descripcion: 'Gestión de facturas y documentos comerciales',
            icono: 'fas fa-file-invoice',
            orden: 1,
            estado_default: true,
            permisos_requeridos: ['contab.facturacion.read', 'contab.facturacion.write'],
            submenus: []
          }
        ],
        configuracion: {
          url_base: 'https://contabilidad.empresa.com',
          timeout: 45000,
          retry_attempts: 2,
          cache_enabled: false
        }
      },
      'inventarios': {
        id: 'sistema_inventarios',
        nombre: 'Sistema de Inventarios',
        codigo: 'INV',
        descripcion: 'Control de stock, movimientos y alertas de inventario',
        categoria: 'logistica',
        prioridad: 'media',
        estado_default: true,
        sso_config: {
          habilitado: false,
          force: false,
          provider: 'basic'
        },
        menus: [
          {
            id: 'menu_stock',
            nombre: 'Control de Stock',
            codigo: 'stock',
            descripcion: 'Gestión de inventario y niveles de stock',
            icono: 'fas fa-boxes',
            orden: 1,
            estado_default: true,
            permisos_requeridos: ['inv.stock.read', 'inv.stock.write'],
            submenus: []
          }
        ],
        configuracion: {
          url_base: 'https://inventarios.empresa.com',
          timeout: 25000,
          retry_attempts: 3,
          cache_enabled: true
        }
      }
    };

    return templates[templateType] || templates['rrhh'];
  }

  /**
   * Obtener lista de plantillas disponibles
   */
  getAvailableTemplates(): string[] {
    return ['rrhh', 'contabilidad', 'inventarios'];
  }

  /**
   * Duplicar un patrón existente
   */
  duplicatePattern(originalPattern: SistemaPattern): SistemaPattern {
    const duplicated = { ...originalPattern };
    
    // Generar nuevo ID
    duplicated.id = `${originalPattern.id}_copy_${Date.now()}`;
    duplicated.nombre = `${originalPattern.nombre} (Copia)`;
    duplicated.codigo = `${originalPattern.codigo}_COPY`;
    
    // Actualizar IDs de menús
    if (duplicated.menus) {
      duplicated.menus = duplicated.menus.map(menu => ({
        ...menu,
        id: `${menu.id}_copy_${Date.now()}`
      }));
    }

    return duplicated;
  }

  /**
   * Validar patrón antes de guardar
   */
  validatePattern(pattern: SistemaPattern): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validaciones básicas
    if (!pattern.id || pattern.id.length < 2) {
      errors.push('ID debe tener al menos 2 caracteres');
    }

    if (!/^[a-z0-9_]+$/.test(pattern.id)) {
      errors.push('ID debe contener solo letras minúsculas, números y guiones bajos');
    }

    if (!pattern.nombre || pattern.nombre.length < 3) {
      errors.push('Nombre debe tener al menos 3 caracteres');
    }

    if (!pattern.codigo || pattern.codigo.length < 2) {
      errors.push('Código debe tener al menos 2 caracteres');
    }

    if (!pattern.descripcion || pattern.descripcion.length < 10) {
      errors.push('Descripción debe tener al menos 10 caracteres');
    }

    // Validaciones de configuración
    if (pattern.configuracion?.url_base && !pattern.configuracion.url_base.startsWith('http')) {
      errors.push('URL base debe comenzar con http:// o https://');
    }

    if (pattern.configuracion?.timeout && (pattern.configuracion.timeout < 1000 || pattern.configuracion.timeout > 120000)) {
      warnings.push('Timeout debe estar entre 1000ms y 120000ms');
    }

    // Validaciones de menús
    if (pattern.menus && pattern.menus.length > 0) {
      pattern.menus.forEach((menu, index) => {
        if (!menu.id || !menu.nombre) {
          errors.push(`Menú ${index + 1} debe tener ID y nombre`);
        }
        
        if (menu.permisos_requeridos && menu.permisos_requeridos.length === 0) {
          warnings.push(`Menú "${menu.nombre}" no tiene permisos configurados`);
        }
      });
    } else {
      warnings.push('No hay menús configurados');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generar documentación del patrón
   */
  generatePatternDocumentation(pattern: SistemaPattern): string {
    let doc = `# Patrón de Diseño: ${pattern.nombre}\n\n`;
    
    doc += `## Información General\n\n`;
    doc += `- **ID**: ${pattern.id}\n`;
    doc += `- **Código**: ${pattern.codigo}\n`;
    doc += `- **Categoría**: ${pattern.categoria}\n`;
    doc += `- **Prioridad**: ${pattern.prioridad}\n`;
    doc += `- **Estado por defecto**: ${pattern.estado_default ? 'Activo' : 'Inactivo'}\n\n`;
    
    doc += `## Descripción\n\n${pattern.descripcion}\n\n`;
    
    doc += `## Configuración SSO\n\n`;
    doc += `- **Habilitado**: ${pattern.sso_config?.habilitado ? 'Sí' : 'No'}\n`;
    doc += `- **Forzar SSO**: ${pattern.sso_config?.force ? 'Sí' : 'No'}\n`;
    doc += `- **Provider**: ${pattern.sso_config?.provider?.toUpperCase() || 'No configurado'}\n\n`;
    
    doc += `## Configuración del Sistema\n\n`;
    doc += `- **URL Base**: ${pattern.configuracion.url_base}\n`;
    doc += `- **Timeout**: ${pattern.configuracion.timeout}ms\n`;
    doc += `- **Reintentos**: ${pattern.configuracion.retry_attempts}\n`;
    doc += `- **Cache**: ${pattern.configuracion.cache_enabled ? 'Habilitado' : 'Deshabilitado'}\n\n`;
    
    doc += `## Menús (${pattern.menus.length})\n\n`;
    pattern.menus.forEach((menu, index) => {
      doc += `### ${index + 1}. ${menu.nombre}\n\n`;
      doc += `- **ID**: ${menu.id}\n`;
      doc += `- **Código**: ${menu.codigo}\n`;
      doc += `- **Icono**: ${menu.icono}\n`;
      doc += `- **Orden**: ${menu.orden}\n`;
      doc += `- **Estado**: ${menu.estado_default ? 'Activo' : 'Inactivo'}\n`;
      doc += `- **Descripción**: ${menu.descripcion}\n\n`;
      
      if (menu.permisos_requeridos && menu.permisos_requeridos.length > 0) {
        doc += `**Permisos requeridos**:\n`;
        menu.permisos_requeridos.forEach(permiso => {
          doc += `- \`${permiso}\`\n`;
        });
        doc += `\n`;
      }
      
      if (menu.submenus && menu.submenus.length > 0) {
        doc += `**Submenús**:\n`;
        menu.submenus.forEach(submenu => {
          doc += `- ${submenu.nombre} (\`${submenu.codigo}\`)\n`;
        });
        doc += `\n`;
      }
    });
    
    return doc;
  }
}
