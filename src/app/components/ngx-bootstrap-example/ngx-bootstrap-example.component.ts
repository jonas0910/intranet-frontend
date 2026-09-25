import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { BsModalService, BsModalRef, ModalModule, ModalDirective } from 'ngx-bootstrap/modal';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { ComponentLoaderFactory, PositioningService } from 'ngx-bootstrap/positioning';

@Component({
  selector: 'app-ngx-bootstrap-example',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BsDropdownModule,
    ModalModule,
    TooltipModule
  ],
  templateUrl: './ngx-bootstrap-example.component.html',
  styleUrls: ['./ngx-bootstrap-example.component.scss']
})
export class NgxBootstrapExampleComponent implements OnInit {
  
  // Modal references
  @ViewChild('modalTemplate') modalTemplate!: ModalDirective;
  
  bsModalRef?: BsModalRef;
  
  // Dropdown state
  isDropdownOpen = false;
  
  // Tooltip configuration
  tooltipConfigs = [
    { text: 'Este es un tooltip', placement: 'top' },
    { text: 'Tooltip a la derecha', placement: 'right' },
    { text: 'Tooltip abajo', placement: 'bottom' },
    { text: 'Tooltip a la izquierda', placement: 'left' }
  ];
  
  // Dropdown items
  dropdownItems = [
    { id: 1, text: 'Opción 1', icon: 'fas fa-user' },
    { id: 2, text: 'Opción 2', icon: 'fas fa-cog' },
    { id: 3, text: 'Opción 3', icon: 'fas fa-sign-out-alt' }
  ];
  
  // Modal data
  modalData = {
    title: 'Modal con ngx-bootstrap',
    content: 'Este es un modal creado completamente con ngx-bootstrap, sin jQuery.'
  };
  
  constructor(private modalService: BsModalService) { }
  
  ngOnInit(): void {
    console.log('✅ NgxBootstrapExampleComponent inicializado');
  }
  
  // Dropdown methods
  selectDropdownItem(item: any): void {
    console.log('Dropdown item selected:', item);
    this.isDropdownOpen = false;
  }
  
  // Modal methods
  openModal(): void {
    // Ejemplo usando BsModalService
    const initialState = {
      title: 'Modal desde servicio',
      content: 'Este modal se abre usando BsModalService directamente.'
    };
    
    this.bsModalRef = this.modalService.show(ModalContentComponent, {
      initialState,
      class: 'modal-dialog-centered'
    });
  }
  
  openTemplateModal(): void {
    // Ejemplo usando template con ViewChild
    this.modalTemplate.show();
  }
  
  closeModal(): void {
    if (this.bsModalRef) {
      this.bsModalRef.hide();
    }
  }
  
  // Tooltip methods
  getTooltipText(placement: string): string {
    return `Tooltip con ngx-bootstrap (${placement})`;
  }
}

// Componente para el modal de ejemplo
@Component({
  selector: 'app-modal-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-header">
      <h4 class="modal-title">{{ title }}</h4>
      <button type="button" class="btn-close" aria-label="Close" (click)="bsModalRef?.hide()">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    <div class="modal-body">
      <p>{{ content }}</p>
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        Este modal usa ngx-bootstrap completamente sin jQuery.
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" (click)="bsModalRef?.hide()">
        Cerrar
      </button>
      <button type="button" class="btn btn-primary" (click)="confirm()">
        Confirmar
      </button>
    </div>
  `
})
export class ModalContentComponent {
  title?: string;
  content?: string;
  
  constructor(public bsModalRef: BsModalRef) {}
  
  confirm(): void {
    console.log('Modal confirmado');
    this.bsModalRef.hide();
  }
}
