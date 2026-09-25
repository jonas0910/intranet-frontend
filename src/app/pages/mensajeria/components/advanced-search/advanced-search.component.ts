import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MessageService } from '../../services/message.service';
import { FolderService, Folder } from '../../services/folder.service';

export interface SearchFilter {
  field: string;
  operator: string;
  value: any;
  label?: string;
}

export interface SavedSearch {
  id: number;
  name: string;
  filters: SearchFilter[];
  created_at: string;
  is_favorite: boolean;
}

export interface SearchResult {
  messages: any[];
  total: number;
  page: number;
  per_page: number;
  filters_applied: SearchFilter[];
}

@Component({
  selector: 'app-advanced-search',
  templateUrl: './advanced-search.component.html',
  styleUrls: ['./advanced-search.component.scss']
})
export class AdvancedSearchComponent implements OnInit, OnDestroy {
  @Input() initialQuery?: string;
  @Input() initialFilters?: SearchFilter[];
  @Output() searchExecuted = new EventEmitter<SearchResult>();
  @Output() searchCleared = new EventEmitter<void>();
  @Output() searchSaved = new EventEmitter<SavedSearch>();

  private destroy$ = new Subject<void>();
  
  searchForm: FormGroup;
  folders: Folder[] = [];
  savedSearches: SavedSearch[] = [];
  
  // UI State
  showAdvanced = false;
  searching = false;
  savingSearch = false;
  
  // Search Results
  searchResults?: SearchResult;
  
  // Field Options
  searchFields = [
    { value: 'content', label: 'Contenido del mensaje' },
    { value: 'subject', label: 'Asunto' },
    { value: 'sender', label: 'Remitente' },
    { value: 'recipient', label: 'Destinatario' },
    { value: 'folder', label: 'Carpeta' },
    { value: 'date', label: 'Fecha' },
    { value: 'priority', label: 'Prioridad' },
    { value: 'has_attachments', label: 'Tiene adjuntos' },
    { value: 'is_read', label: 'Estado de lectura' },
    { value: 'is_important', label: 'Es importante' }
  ];
  
  // Operator Options
  operatorOptions = {
    text: [
      { value: 'contains', label: 'Contiene' },
      { value: 'not_contains', label: 'No contiene' },
      { value: 'equals', label: 'Es igual a' },
      { value: 'not_equals', label: 'No es igual a' },
      { value: 'starts_with', label: 'Comienza con' },
      { value: 'ends_with', label: 'Termina con' }
    ],
    date: [
      { value: 'equals', label: 'Es igual a' },
      { value: 'before', label: 'Antes de' },
      { value: 'after', label: 'Después de' },
      { value: 'between', label: 'Entre' },
      { value: 'last_days', label: 'Últimos días' },
      { value: 'this_week', label: 'Esta semana' },
      { value: 'this_month', label: 'Este mes' },
      { value: 'this_year', label: 'Este año' }
    ],
    select: [
      { value: 'equals', label: 'Es igual a' },
      { value: 'not_equals', label: 'No es igual a' }
    ],
    boolean: [
      { value: 'is_true', label: 'Sí' },
      { value: 'is_false', label: 'No' }
    ]
  };
  
  // Priority Options
  priorityOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' }
  ];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private folderService: FolderService
  ) {
    this.searchForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadFolders();
    this.loadSavedSearches();
    this.setupFormSubscriptions();
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      quickSearch: [''],
      filters: this.fb.array([]),
      sortBy: ['date'],
      sortOrder: ['desc'],
      dateRange: this.fb.group({
        from: [''],
        to: ['']
      })
    });
  }

  private initializeForm(): void {
    if (this.initialQuery) {
      this.searchForm.patchValue({ quickSearch: this.initialQuery });
    }
    
    if (this.initialFilters && this.initialFilters.length > 0) {
      this.showAdvanced = true;
      this.initialFilters.forEach(filter => {
        this.addFilter(filter);
      });
    } else {
      // Add one empty filter by default
      this.addFilter();
    }
  }

  private setupFormSubscriptions(): void {
    // Quick search with debounce
    this.searchForm.get('quickSearch')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(query => {
        if (query && query.length >= 2) {
          this.executeQuickSearch(query);
        } else if (!query) {
          this.clearSearch();
        }
      });
  }

  private loadFolders(): void {
    this.folderService.folders$
      .pipe(takeUntil(this.destroy$))
      .subscribe(folders => {
        this.folders = folders;
      });
  }

  private loadSavedSearches(): void {
    this.messageService.getSavedSearches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.savedSearches = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading saved searches:', error);
        }
      });
  }

  // Filter Management
  get filtersArray(): FormArray {
    return this.searchForm.get('filters') as FormArray;
  }

  addFilter(filter?: SearchFilter): void {
    const filterGroup = this.fb.group({
      field: [filter?.field || ''],
      operator: [filter?.operator || ''],
      value: [filter?.value || ''],
      value2: [''] // For between operations
    });

    this.filtersArray.push(filterGroup);
  }

  removeFilter(index: number): void {
    this.filtersArray.removeAt(index);
  }

  clearAllFilters(): void {
    this.filtersArray.clear();
    this.addFilter(); // Add one empty filter
  }

  // Search Operations
  executeQuickSearch(query: string): void {
    this.searching = true;
    
    const searchParams = {
      q: query,
      sort_by: this.searchForm.value.sortBy,
      sort_order: this.searchForm.value.sortOrder
    };

    this.messageService.searchMessages(searchParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.searching = false;
          if (response.success) {
            this.searchResults = {
              messages: response.data.data,
              total: response.data.total,
              page: response.data.current_page,
              per_page: response.data.per_page,
              filters_applied: [{ field: 'content', operator: 'contains', value: query }]
            };
            this.searchExecuted.emit(this.searchResults);
          }
        },
        error: (error) => {
          this.searching = false;
          console.error('Error executing quick search:', error);
        }
      });
  }

  executeAdvancedSearch(): void {
    const filters = this.buildFiltersFromForm();
    
    if (filters.length === 0) {
      return;
    }

    this.searching = true;
    
    const searchParams = {
      filters: filters,
      sort_by: this.searchForm.value.sortBy,
      sort_order: this.searchForm.value.sortOrder,
      date_from: this.searchForm.value.dateRange.from,
      date_to: this.searchForm.value.dateRange.to
    };

    this.messageService.advancedSearch(searchParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.searching = false;
          if (response.success) {
            this.searchResults = {
              messages: response.data.data,
              total: response.data.total,
              page: response.data.current_page,
              per_page: response.data.per_page,
              filters_applied: filters
            };
            this.searchExecuted.emit(this.searchResults);
          }
        },
        error: (error) => {
          this.searching = false;
          console.error('Error executing advanced search:', error);
        }
      });
  }

  clearSearch(): void {
    this.searchForm.patchValue({ quickSearch: '' });
    this.clearAllFilters();
    this.searchResults = undefined;
    this.searchCleared.emit();
  }

  // Saved Searches
  saveCurrentSearch(): void {
    const searchName = prompt('Nombre para la búsqueda guardada:');
    if (!searchName) {
      return;
    }

    const filters = this.buildFiltersFromForm();
    if (filters.length === 0) {
      alert('No hay filtros para guardar');
      return;
    }

    this.savingSearch = true;
    
    const saveData = {
      name: searchName,
      filters: filters,
      sort_by: this.searchForm.value.sortBy,
      sort_order: this.searchForm.value.sortOrder
    };

    this.messageService.saveSearch(saveData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.savingSearch = false;
          if (response.success) {
            this.savedSearches.push(response.data);
            this.searchSaved.emit(response.data);
          }
        },
        error: (error) => {
          this.savingSearch = false;
          console.error('Error saving search:', error);
          alert('Error al guardar la búsqueda');
        }
      });
  }

  loadSavedSearch(savedSearch: SavedSearch): void {
    this.clearAllFilters();
    
    savedSearch.filters.forEach(filter => {
      this.addFilter(filter);
    });
    
    this.showAdvanced = true;
    this.executeAdvancedSearch();
  }

  deleteSavedSearch(savedSearch: SavedSearch): void {
    if (!confirm(`¿Eliminar la búsqueda "${savedSearch.name}"?`)) {
      return;
    }

    this.messageService.deleteSavedSearch(savedSearch.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.savedSearches = this.savedSearches.filter(s => s.id !== savedSearch.id);
          }
        },
        error: (error) => {
          console.error('Error deleting saved search:', error);
          alert('Error al eliminar la búsqueda');
        }
      });
  }

  // Helper Methods
  private buildFiltersFromForm(): SearchFilter[] {
    const filters: SearchFilter[] = [];
    
    this.filtersArray.controls.forEach(control => {
      const field = control.get('field')?.value;
      const operator = control.get('operator')?.value;
      const value = control.get('value')?.value;
      
      if (field && operator && value !== null && value !== '') {
        const filter: SearchFilter = {
          field,
          operator,
          value,
          label: this.getFilterLabel(field, operator, value)
        };
        
        // Handle between operator
        if (operator === 'between') {
          const value2 = control.get('value2')?.value;
          if (value2) {
            filter.value = [value, value2];
          }
        }
        
        filters.push(filter);
      }
    });
    
    return filters;
  }

  private getFilterLabel(field: string, operator: string, value: any): string {
    const fieldLabel = this.searchFields.find(f => f.value === field)?.label || field;
    const operatorLabel = this.getOperatorLabel(field, operator);
    
    let valueLabel = value;
    if (field === 'folder' && typeof value === 'number') {
      const folder = this.folders.find(f => f.id === value);
      valueLabel = folder?.name || value;
    } else if (field === 'priority') {
      const priority = this.priorityOptions.find(p => p.value === value);
      valueLabel = priority?.label || value;
    }
    
    return `${fieldLabel} ${operatorLabel} ${valueLabel}`;
  }

  getOperatorLabel(field: string, operator: string): string {
    const fieldType = this.getFieldType(field);
    const operators = this.operatorOptions[fieldType] || this.operatorOptions.text;
    return operators.find(op => op.value === operator)?.label || operator;
  }

  getFieldType(field: string): keyof typeof this.operatorOptions {
    const dateFields = ['date', 'created_at', 'updated_at'];
    const booleanFields = ['has_attachments', 'is_read', 'is_important'];
    const selectFields = ['folder', 'priority'];
    
    if (dateFields.includes(field)) return 'date';
    if (booleanFields.includes(field)) return 'boolean';
    if (selectFields.includes(field)) return 'select';
    return 'text';
  }

  getOperatorsForField(field: string) {
    const fieldType = this.getFieldType(field);
    return this.operatorOptions[fieldType] || this.operatorOptions.text;
  }

  shouldShowValue2(operator: string): boolean {
    return operator === 'between';
  }

  shouldShowValueInput(field: string, operator: string): boolean {
    const noValueOperators = ['this_week', 'this_month', 'this_year', 'is_true', 'is_false'];
    return !noValueOperators.includes(operator);
  }

  getInputType(field: string): string {
    const dateFields = ['date', 'created_at', 'updated_at'];
    const numberFields = ['last_days'];
    
    if (dateFields.includes(field)) return 'date';
    if (numberFields.includes(field)) return 'number';
    return 'text';
  }

  // Getters for template
  get hasActiveFilters(): boolean {
    return this.buildFiltersFromForm().length > 0;
  }

  get hasQuickSearch(): boolean {
    return !!this.searchForm.value.quickSearch;
  }

  get hasSavedSearches(): boolean {
    return this.savedSearches.length > 0;
  }

  get canSaveSearch(): boolean {
    return this.hasActiveFilters && !this.savingSearch;
  }

  toggleAdvanced(): void {
    this.showAdvanced = !this.showAdvanced;
    if (!this.showAdvanced) {
      this.clearAllFilters();
    }
  }
}