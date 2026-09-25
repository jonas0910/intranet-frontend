import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalModule, BsModalService, BsModalRef, ModalDirective } from 'ngx-bootstrap/modal';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TooltipModule } from 'ngx-bootstrap/tooltip';

interface MockData {
  id: number;
  name: string;
  description: string;
  status: string;
}

@Component({
  selector: 'app-migrated-modal-example',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalModule,
    BsDropdownModule,
    TooltipModule
  ],
  templateUrl: './migrated-modal-example.component.html',
  styleUrls: ['./migrated-modal-example.component.scss']
})
export class MigratedModalExampleComponent implements OnInit {
  
  // Modal references
  @ViewChild('createModal') createModal!: ModalDirective;
  @ViewChild('editModal') editModal!: ModalDirective;
  
  bsModalRef?: BsModalRef;
  
  // Forms
  createForm!: FormGroup;
  editForm!: FormGroup;
  
  // Data
  items: MockData[] = [
    { id: 1, name: 'Acceso RRHH', description: 'Acceso completo al módulo de RRHH', status: 'Activo' },
    { id: 2, name: 'Acceso Contabilidad', description: 'Acceso de solo lectura a contabilidad', status: 'Activo' },
    { id: 3, name: 'Acceso Admin', description: 'Acceso administrativo completo', status: 'Inactivo' }
  ];
  
  // Dropdown options
  statusOptions = [
    { value: 'Activo', label: 'Activo', class: 'badge badge-success' },
    { value: 'Inactivo', label: 'Inactivo', class: 'badge badge-danger' },
    { value: 'Pendiente', label: 'Pendiente', class: 'badge badge-warning' }
  ];
  
  // UI State
  selectedItem: MockData | null = null;
  isLoading = false;
  
  constructor(
    private fb: FormBuilder,
    private modalService: BsModalService
  ) {}
  
  ngOnInit(): void {
    this.initializeForms();
    console.log('✅ MigratedModalExampleComponent: Migrado de jQuery a ngx-bootstrap');
  }
  
  private initializeForms(): void {
    // Create Form
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      status: ['Activo', Validators.required]
    });
    
    // Edit Form
    this.editForm = this.fb.group({
      id: [''],
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      status: ['', Validators.required]
    });
  }
  
  // Modal Methods (ngx-bootstrap way)
  
  openCreateModal(): void {
    this.createForm.reset({ status: 'Activo' });
    this.createModal.show();
  }
  
  openEditModal(item: MockData): void {
    this.selectedItem = item;
    this.editForm.patchValue({
      id: item.id,
      name: item.name,
      description: item.description,
      status: item.status
    });
    this.editModal.show();
  }
  
  openDeleteModal(item: MockData): void {
    this.selectedItem = item;
    // Use Modal Service for dynamic modals
    const initialState = {
      title: 'Confirmar Eliminación',
      message: `¿Estás seguro de que quieres eliminar "${item.name}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      item: item
    };
    
    this.bsModalRef = this.modalService.show(
      ConfirmModalComponent, 
      { initialState }
    );
    
    // Handle modal result
    this.bsModalRef.content?.onClose.subscribe((result: boolean) => {
      if (result) {
        this.deleteItem(item);
      }
    });
  }
  
  // CRUD Methods
  
  createItem(): void {
    if (this.createForm.valid) {
      const newItem: MockData = {
        id: this.generateId(),
        ...this.createForm.value
      };
      
      this.isLoading = true;
      
      // Simulate API call
      setTimeout(() => {
        this.items.push(newItem);
        this.createModal.hide();
        this.createForm.reset();
        this.isLoading = false;
        console.log('✅ Item created:', newItem);
      }, 500);
    }
  }
  
  updateItem(): void {
    if (this.editForm.valid && this.selectedItem) {
      const updatedItem = {
        ...this.editForm.value,
        id: this.selectedItem.id
      };
      
      this.isLoading = true;
      
      // Simulate API call
      setTimeout(() => {
        const index = this.items.findIndex(item => item.id === this.selectedItem!.id);
        if (index !== -1) {
          this.items[index] = updatedItem;
        }
        this.editModal.hide();
        this.selectedItem = null;
        this.editForm.reset();
        this.isLoading = false;
        console.log('✅ Item updated:', updatedItem);
      }, 500);
    }
  }
  
  deleteItem(item: MockData): void {
    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      this.items = this.items.filter(i => i.id !== item.id);
      this.selectedItem = null;
      this.isLoading = false;
      console.log('✅ Item deleted:', item);
    }, 500);
  }
  
  // Utility Methods
  
  private generateId(): number {
    return Math.max(...this.items.map(item => item.id)) + 1;
  }
  
  getStatusClass(status: string): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option ? option.class : 'badge badge-secondary';
  }
  
  // Modal Handlers
  
  onCancelCreate(): void {
    this.createModal.hide();
    this.createForm.reset();
  }
  
  onCancelEdit(): void {
    this.editModal.hide();
    this.editForm.reset();
    this.selectedItem = null;
  }
  
  // Dropdown Demo
  
  onDropdownAction(action: string): void {
    console.log('Dropdown action:', action);
    
    // Demonstrating different actions
    switch(action) {
      case 'export':
        console.log('Exportar datos...');
        break;
      case 'print':
        console.log('Imprimir lista...');
        break;
      case 'refresh':
        console.log('Actualizar datos...');
        break;
    }
  }
}

// Confirmation Modal Component using Modal Service
@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-header">
      <h4 class="modal-title">{{ title }}</h4>
      <button type="button" class="btn-close" aria-label="Close" (click)="bsModalRef?.hide()">
        <span>&times;</span>
      </button>
    </div>
    <div class="modal-body">
      <p>{{ message }}</p>
      <div class="alert alert-warning" *ngIf="item">
        <i class="fas fa-exclamation-triangle"></i>
        Esta acción no se puede deshacer.
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" (click)="cancel()">
        {{ cancelText }}
      </button>
      <button type="button" class="btn btn-danger" (click)="confirm()">
        {{ confirmText }}
      </button>
    </div>
  `
})
export class ConfirmModalComponent {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  item?: MockData;
  
  onClose = new EventEmitter<boolean>();
  
  constructor(public bsModalRef: BsModalRef) {}
  
  confirm(): void {
    this.onClose.emit(true);
    this.bsModalRef.hide();
  }
  
  cancel(): void {
    this.onClose.emit(false);
    this.bsModalRef.hide();
  }
}

