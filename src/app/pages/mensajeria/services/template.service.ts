import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';

export interface MessageTemplate {
  id: number;
  name: string;
  subject: string;
  content: string;
  category: 'system' | 'personal' | 'department';
  tags: string[];
  variables: TemplateVariable[];
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  default_value?: any;
  options?: string[]; // For select type
  description?: string;
}

export interface CreateTemplateRequest {
  name: string;
  subject: string;
  content: string;
  category: 'system' | 'personal' | 'department';
  tags?: string[];
  variables?: TemplateVariable[];
  is_active?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  subject?: string;
  content?: string;
  category?: 'system' | 'personal' | 'department';
  tags?: string[];
  variables?: TemplateVariable[];
  is_active?: boolean;
}

export interface TemplateUsage {
  template_id: number;
  variables: { [key: string]: any };
  subject: string;
  content: string;
}

export interface Draft {
  id: number;
  subject?: string;
  content: string;
  recipients: any[];
  attachments?: any[];
  template_id?: number;
  template_variables?: { [key: string]: any };
  created_at: string;
  updated_at: string;
}

export interface CreateDraftRequest {
  subject?: string;
  content: string;
  recipients?: any[];
  attachments?: any[];
  template_id?: number;
  template_variables?: { [key: string]: any };
}

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private readonly apiUrl = `${environment.apiUrl}/mensajeria`;
  private templatesSubject = new BehaviorSubject<MessageTemplate[]>([]);
  private draftsSubject = new BehaviorSubject<Draft[]>([]);

  public templates$ = this.templatesSubject.asObservable();
  public drafts$ = this.draftsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadTemplates();
    this.loadDrafts();
  }

  // Template CRUD operations
  getTemplates(params?: any): Observable<ApiResponse<MessageTemplate[]>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return this.http.get<ApiResponse<MessageTemplate[]>>(`${this.apiUrl}/templates`, { params: httpParams });
  }

  getTemplate(id: number): Observable<ApiResponse<MessageTemplate>> {
    return this.http.get<ApiResponse<MessageTemplate>>(`${this.apiUrl}/templates/${id}`);
  }

  createTemplate(templateData: CreateTemplateRequest): Observable<ApiResponse<MessageTemplate>> {
    return this.http.post<ApiResponse<MessageTemplate>>(`${this.apiUrl}/templates`, templateData);
  }

  updateTemplate(id: number, templateData: UpdateTemplateRequest): Observable<ApiResponse<MessageTemplate>> {
    return this.http.put<ApiResponse<MessageTemplate>>(`${this.apiUrl}/templates/${id}`, templateData);
  }

  deleteTemplate(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/templates/${id}`);
  }

  duplicateTemplate(id: number, name: string): Observable<ApiResponse<MessageTemplate>> {
    return this.http.post<ApiResponse<MessageTemplate>>(`${this.apiUrl}/templates/${id}/duplicate`, { name });
  }

  // Template usage
  useTemplate(templateId: number, variables: { [key: string]: any }): Observable<ApiResponse<TemplateUsage>> {
    return this.http.post<ApiResponse<TemplateUsage>>(`${this.apiUrl}/templates/${templateId}/use`, { variables });
  }

  previewTemplate(templateId: number, variables: { [key: string]: any }): Observable<ApiResponse<TemplateUsage>> {
    return this.http.post<ApiResponse<TemplateUsage>>(`${this.apiUrl}/templates/${templateId}/preview`, { variables });
  }

  // Draft operations
  getDrafts(params?: any): Observable<ApiResponse<Draft[]>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return this.http.get<ApiResponse<Draft[]>>(`${this.apiUrl}/drafts`, { params: httpParams });
  }

  getDraft(id: number): Observable<ApiResponse<Draft>> {
    return this.http.get<ApiResponse<Draft>>(`${this.apiUrl}/drafts/${id}`);
  }

  createDraft(draftData: CreateDraftRequest): Observable<ApiResponse<Draft>> {
    return this.http.post<ApiResponse<Draft>>(`${this.apiUrl}/drafts`, draftData);
  }

  updateDraft(id: number, draftData: CreateDraftRequest): Observable<ApiResponse<Draft>> {
    return this.http.put<ApiResponse<Draft>>(`${this.apiUrl}/drafts/${id}`, draftData);
  }

  deleteDraft(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/drafts/${id}`);
  }

  sendDraft(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/drafts/${id}/send`, {});
  }

  // Auto-save draft
  autoSaveDraft(draftData: CreateDraftRequest, draftId?: number): Observable<ApiResponse<Draft>> {
    if (draftId) {
      return this.updateDraft(draftId, draftData);
    } else {
      return this.createDraft(draftData);
    }
  }

  // Template management
  private loadTemplates(): void {
    this.getTemplates().subscribe({
      next: (response) => {
        if (response.success) {
          this.templatesSubject.next(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading templates:', error);
      }
    });
  }

  private loadDrafts(): void {
    this.getDrafts().subscribe({
      next: (response) => {
        if (response.success) {
          this.draftsSubject.next(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading drafts:', error);
      }
    });
  }

  refreshTemplates(): void {
    this.loadTemplates();
  }

  refreshDrafts(): void {
    this.loadDrafts();
  }

  // Helper methods
  getTemplatesByCategory(category: string): MessageTemplate[] {
    return this.templatesSubject.value.filter(template => template.category === category);
  }

  getSystemTemplates(): MessageTemplate[] {
    return this.getTemplatesByCategory('system');
  }

  getPersonalTemplates(): MessageTemplate[] {
    return this.getTemplatesByCategory('personal');
  }

  getDepartmentTemplates(): MessageTemplate[] {
    return this.getTemplatesByCategory('department');
  }

  searchTemplates(query: string): MessageTemplate[] {
    const searchTerm = query.toLowerCase();
    return this.templatesSubject.value.filter(template =>
      template.name.toLowerCase().includes(searchTerm) ||
      template.subject.toLowerCase().includes(searchTerm) ||
      template.content.toLowerCase().includes(searchTerm) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  getTemplateById(id: number): MessageTemplate | undefined {
    return this.templatesSubject.value.find(template => template.id === id);
  }

  getDraftById(id: number): Draft | undefined {
    return this.draftsSubject.value.find(draft => draft.id === id);
  }

  // Template processing
  processTemplate(template: MessageTemplate, variables: { [key: string]: any }): TemplateUsage {
    let processedSubject = template.subject;
    let processedContent = template.content;

    // Replace variables in subject and content
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = variables[key] || '';
      
      processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
    });

    return {
      template_id: template.id,
      variables,
      subject: processedSubject,
      content: processedContent
    };
  }

  extractVariablesFromTemplate(content: string): string[] {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  validateTemplateVariables(template: MessageTemplate, variables: { [key: string]: any }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    template.variables.forEach(variable => {
      if (variable.required && (!variables[variable.name] || variables[variable.name] === '')) {
        errors.push(`El campo "${variable.label}" es requerido`);
      }
      
      if (variables[variable.name] && variable.type === 'number' && isNaN(Number(variables[variable.name]))) {
        errors.push(`El campo "${variable.label}" debe ser un número`);
      }
      
      if (variables[variable.name] && variable.type === 'date' && !this.isValidDate(variables[variable.name])) {
        errors.push(`El campo "${variable.label}" debe ser una fecha válida`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Default templates
  getDefaultTemplates(): MessageTemplate[] {
    return [
      {
        id: 0,
        name: 'Reunión de trabajo',
        subject: 'Reunión: {{titulo}}',
        content: `Estimado/a {{nombre}},

Por medio de la presente, le convocamos a la reunión que se llevará a cabo el día {{fecha}} a las {{hora}} en {{lugar}}.

Agenda:
{{agenda}}

Por favor, confirme su asistencia.

Saludos cordiales,
{{remitente}}`,
        category: 'system',
        tags: ['reunión', 'convocatoria', 'trabajo'],
        variables: [
          { name: 'nombre', label: 'Nombre del destinatario', type: 'text', required: true },
          { name: 'titulo', label: 'Título de la reunión', type: 'text', required: true },
          { name: 'fecha', label: 'Fecha', type: 'date', required: true },
          { name: 'hora', label: 'Hora', type: 'text', required: true },
          { name: 'lugar', label: 'Lugar', type: 'text', required: true },
          { name: 'agenda', label: 'Agenda', type: 'text', required: false },
          { name: 'remitente', label: 'Remitente', type: 'text', required: true }
        ],
        is_active: true,
        is_default: true,
        usage_count: 0,
        created_by: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 0,
        name: 'Comunicado oficial',
        subject: 'Comunicado: {{asunto}}',
        content: `COMUNICADO OFICIAL

Fecha: {{fecha}}
Asunto: {{asunto}}

{{contenido}}

Para mayor información, contactar a {{contacto}}.

Atentamente,
{{cargo}}
{{departamento}}`,
        category: 'system',
        tags: ['comunicado', 'oficial', 'información'],
        variables: [
          { name: 'fecha', label: 'Fecha', type: 'date', required: true },
          { name: 'asunto', label: 'Asunto', type: 'text', required: true },
          { name: 'contenido', label: 'Contenido', type: 'text', required: true },
          { name: 'contacto', label: 'Contacto', type: 'text', required: false },
          { name: 'cargo', label: 'Cargo', type: 'text', required: true },
          { name: 'departamento', label: 'Departamento', type: 'text', required: true }
        ],
        is_active: true,
        is_default: true,
        usage_count: 0,
        created_by: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  // Statistics
  getTemplateStats(): { total: number; byCategory: { [key: string]: number }; mostUsed: MessageTemplate[] } {
    const templates = this.templatesSubject.value;
    const byCategory: { [key: string]: number } = {};
    
    templates.forEach(template => {
      byCategory[template.category] = (byCategory[template.category] || 0) + 1;
    });
    
    const mostUsed = templates
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 5);

    return {
      total: templates.length,
      byCategory,
      mostUsed
    };
  }
}