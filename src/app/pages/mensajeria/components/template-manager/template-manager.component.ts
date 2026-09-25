import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  TemplateService, 
  MessageTemplate, 
  TemplateVariable, 
  CreateTemplateRequest,
  TemplateUsage 
} from '../../services/template.service';

@Component({
  selector: 'app-template-manager',
  templateUrl: './template-manager.component.html',
  styleUrls: ['./template-manager.component.scss']
})
export class TemplateManagerComponent implements OnInit, OnDestroy {
  @Input() mode: 'select' | 'manage' = 'select';
  @Input() category?: string;
  @Input() showCreateButton = true;
  @Output() templateSelected = new EventEmitter<TemplateUsage>();
  @Output() templateCreated = new EventEmitter<MessageTemplate>();
  @Output() templateUpdated = new EventEmitter<MessageTemplate>();
  @Output() templateDeleted = new EventEmitter<number>();

  private destroy$ = new Subject<void>();
  
  templates: MessageTemplate[] = [];
  filteredTemplates: MessageTemplate[] = [];
  selectedTemplate?: MessageTemplate;
  
  // UI State
  loading = false;
  showCreateModal = false;
  showEditModal = false;
  showVariablesModal = false;
  showPreviewModal = false;
  
  // Forms
  templateForm: FormGroup;
  variablesForm: FormGroup;
  
  // Search and filters
  searchQuery = '';
  selectedCategory = 'all';
  
  // Categories
  categories = [
    { value: 'all', label: 'Todas las categorías' },
    { value: 'system', label: 'Sistema' },
    { value: 'personal', label: 'Personal' },
    { value: 'department', label: 'Departamento' }
  ];
  
  // Variable types
  variableTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Fecha' },
    { value: 'select', label: 'Selección' },
    { value: 'boolean', label: 'Sí/No' }
  ];
  
  // Preview
  previewContent = '';
  previewSubject = '';

  constructor(
    private fb: FormBuilder,
    private templateService: TemplateService
  ) {
    this.templateForm = this.createTemplateForm();
    this.variablesForm = this.createVariablesForm();
  }

  ngOnInit(): void {
    this.loadTemplates();
    this.subscribeToTemplates();
    
    if (this.category) {
      this.selectedCategory = this.category;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createTemplateForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      subject: ['', Validators.required],
      content: ['', Validators.required],
      category: ['personal', Validators.required],
      tags: [''],
      variables: this.fb.array([]),
      is_active: [true]
    });
  }

  private createVariablesForm(): FormGroup {
    return this.fb.group({
      variables: this.fb.array([])
    });
  }

  private loadTemplates(): void {
    this.loading = true;
    this.templateService.getTemplates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.templates = response.data;
            this.applyFilters();
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error loading templates:', error);
        }
      });
  }

  private subscribeToTemplates(): void {
    this.templateService.templates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(templates => {
        this.templates = templates;
        this.applyFilters();
      });
  }

  // Template Management
  onCreateTemplate(): void {
    this.templateForm.reset({
      category: 'personal',
      is_active: true
    });
    this.clearVariablesArray();
    this.showCreateModal = true;
  }

  onEditTemplate(template: MessageTemplate): void {
    this.selectedTemplate = template;
    this.templateForm.patchValue({
      name: template.name,
      subject: template.subject,
      content: template.content,
      category: template.category,
      tags: template.tags.join(', '),
      is_active: template.is_active
    });
    
    this.setVariablesArray(template.variables);
    this.showEditModal = true;
  }

  onSaveTemplate(): void {
    if (!this.templateForm.valid) {
      return;
    }

    const formValue = this.templateForm.value;
    const templateData: CreateTemplateRequest = {
      name: formValue.name,
      subject: formValue.subject,
      content: formValue.content,
      category: formValue.category,
      tags: formValue.tags ? formValue.tags.split(',').map((tag: string) => tag.trim()) : [],
      variables: this.getVariablesFromForm(),
      is_active: formValue.is_active
    };

    const operation = this.selectedTemplate 
      ? this.templateService.updateTemplate(this.selectedTemplate.id, templateData)
      : this.templateService.createTemplate(templateData);

    operation.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            if (this.selectedTemplate) {
              this.templateUpdated.emit(response.data);
            } else {
              this.templateCreated.emit(response.data);
            }
            this.closeModals();
            this.templateService.refreshTemplates();
          }
        },
        error: (error) => {
          console.error('Error saving template:', error);
        }
      });
  }

  onDeleteTemplate(template: MessageTemplate): void {
    if (!confirm(`¿Está seguro de que desea eliminar la plantilla "${template.name}"?`)) {
      return;
    }

    this.templateService.deleteTemplate(template.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.templateDeleted.emit(template.id);
            this.templateService.refreshTemplates();
          }
        },
        error: (error) => {
          console.error('Error deleting template:', error);
        }
      });
  }

  onDuplicateTemplate(template: MessageTemplate): void {
    const newName = prompt('Nombre para la plantilla duplicada:', `${template.name} (Copia)`);
    if (!newName) {
      return;
    }

    this.templateService.duplicateTemplate(template.id, newName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.templateCreated.emit(response.data);
            this.templateService.refreshTemplates();
          }
        },
        error: (error) => {
          console.error('Error duplicating template:', error);
        }
      });
  }

  // Template Usage
  onUseTemplate(template: MessageTemplate): void {
    if (template.variables.length > 0) {
      this.selectedTemplate = template;
      this.createVariablesForm(template);
      this.showVariablesModal = true;
    } else {
      // No variables, use template directly
      const usage = this.templateService.processTemplate(template, {});
      this.templateSelected.emit(usage);
    }
  }

  onApplyTemplate(): void {
    if (!this.selectedTemplate || !this.variablesForm.valid) {
      return;
    }

    const variables = this.getVariableValues();
    const validation = this.templateService.validateTemplateVariables(this.selectedTemplate, variables);
    
    if (!validation.isValid) {
      alert('Por favor, complete todos los campos requeridos:\n' + validation.errors.join('\n'));
      return;
    }

    const usage = this.templateService.processTemplate(this.selectedTemplate, variables);
    this.templateSelected.emit(usage);
    this.closeModals();
  }

  onPreviewTemplate(): void {
    if (!this.selectedTemplate) {
      return;
    }

    const variables = this.getVariableValues();
    const usage = this.templateService.processTemplate(this.selectedTemplate, variables);
    
    this.previewSubject = usage.subject;
    this.previewContent = usage.content;
    this.showPreviewModal = true;
  }

  // Variables Management
  get variablesArray(): FormArray {
    return this.templateForm.get('variables') as FormArray;
  }

  get variablesFormArray(): FormArray {
    return this.variablesForm.get('variables') as FormArray;
  }

  addVariable(): void {
    const variableGroup = this.fb.group({
      name: ['', Validators.required],
      label: ['', Validators.required],
      type: ['text', Validators.required],
      required: [false],
      default_value: [''],
      options: [''],
      description: ['']
    });

    this.variablesArray.push(variableGroup);
  }

  removeVariable(index: number): void {
    this.variablesArray.removeAt(index);
  }

  private setVariablesArray(variables: TemplateVariable[]): void {
    this.clearVariablesArray();
    variables.forEach(variable => {
      const variableGroup = this.fb.group({
        name: [variable.name, Validators.required],
        label: [variable.label, Validators.required],
        type: [variable.type, Validators.required],
        required: [variable.required],
        default_value: [variable.default_value || ''],
        options: [variable.options ? variable.options.join(', ') : ''],
        description: [variable.description || '']
      });
      this.variablesArray.push(variableGroup);
    });
  }

  private clearVariablesArray(): void {
    while (this.variablesArray.length !== 0) {
      this.variablesArray.removeAt(0);
    }
  }

  private getVariablesFromForm(): TemplateVariable[] {
    return this.variablesArray.controls.map(control => {
      const value = control.value;
      return {
        name: value.name,
        label: value.label,
        type: value.type,
        required: value.required,
        default_value: value.default_value,
        options: value.options ? value.options.split(',').map((opt: string) => opt.trim()) : undefined,
        description: value.description
      };
    });
  }

  private createVariablesForm(template: MessageTemplate): void {
    const variablesArray = this.fb.array([]);
    
    template.variables.forEach(variable => {
      const control = this.fb.control(
        variable.default_value || '',
        variable.required ? Validators.required : null
      );
      variablesArray.push(control);
    });

    this.variablesForm = this.fb.group({
      variables: variablesArray
    });
  }

  private getVariableValues(): { [key: string]: any } {
    const values: { [key: string]: any } = {};
    
    if (this.selectedTemplate) {
      this.selectedTemplate.variables.forEach((variable, index) => {
        const control = this.variablesFormArray.at(index);
        values[variable.name] = control.value;
      });
    }

    return values;
  }

  // Filtering and Search
  onSearchChange(): void {
    this.applyFilters();
  }

  onCategoryChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.templates];

    // Apply category filter
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === this.selectedCategory);
    }

    // Apply search filter
    if (this.searchQuery) {
      filtered = this.templateService.searchTemplates(this.searchQuery);
      if (this.selectedCategory !== 'all') {
        filtered = filtered.filter(template => template.category === this.selectedCategory);
      }
    }

    this.filteredTemplates = filtered;
  }

  // UI Helpers
  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showVariablesModal = false;
    this.showPreviewModal = false;
    this.selectedTemplate = undefined;
  }

  getCategoryLabel(category: string): string {
    const categoryObj = this.categories.find(cat => cat.value === category);
    return categoryObj?.label || category;
  }

  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'system': 'primary',
      'personal': 'success',
      'department': 'info'
    };
    return colors[category] || 'secondary';
  }

  getVariableTypeLabel(type: string): string {
    const typeObj = this.variableTypes.find(t => t.value === type);
    return typeObj?.label || type;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  // Getters for template
  get hasTemplates(): boolean {
    return this.filteredTemplates.length > 0;
  }

  get isSearching(): boolean {
    return !!this.searchQuery;
  }

  get isFiltering(): boolean {
    return this.selectedCategory !== 'all';
  }
}