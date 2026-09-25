import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalCrudConfig } from '../../../services/design-system.service';

const DS_KEY = 'design-system-config';

function getModalConfig(): ModalCrudConfig {
  try {
    const raw = localStorage.getItem(DS_KEY);
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg.modalCrud) return cfg.modalCrud;
    }
  } catch { /* ignore */ }
  return {
    headerBg: '#007bff', headerText: '#ffffff', headerIcon: 'fas fa-edit',
    bodyBg: '#ffffff', footerBg: '#f8f9fa', borderRadius: 12,
    saveBtnClass: 'btn-primary', saveBtnIcon: 'fas fa-save', saveBtnLabel: 'Guardar',
    cancelBtnClass: 'btn-secondary', cancelBtnIcon: 'fas fa-times', cancelBtnLabel: 'Cancelar',
    deleteBtnClass: 'btn-danger', deleteBtnIcon: 'fas fa-trash', deleteBtnLabel: 'Eliminar',
    titleAdd: 'Nuevo Registro', titleEdit: 'Editar Registro',
    labelColor: '#495057', labelWeight: 'normal', inputSize: 'form-control-sm',
    labelMarginBottom: '0.25rem', formPadding: '1rem',
    headerPadding: '0.75rem 1rem', headerFontSize: '1.1rem'
  };
}

@Component({
  selector: 'app-crud-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './crud-modal.component.html',
  styleUrls: ['./crud-modal.component.scss']
})
export class CrudModalComponent implements OnInit {
  @Input() mode: 'add' | 'edit' = 'add';
  @Input() title?: string;
  @Input() icon?: string;
  @Input() showDelete = false;
  @Input() saving = false;

  @Output() onSave = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() onDelete = new EventEmitter<void>();

  mc!: ModalCrudConfig;

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit(): void {
    this.mc = getModalConfig();
  }

  get headerIcon(): string {
    return this.icon || this.mc.headerIcon;
  }

  get headerTitle(): string {
    if (this.title) return this.title;
    return this.mode === 'add' ? this.mc.titleAdd : this.mc.titleEdit;
  }

  save(): void {
    this.onSave.emit();
  }

  cancel(): void {
    this.onCancel.emit();
    this.activeModal.dismiss('cancel');
  }

  delete(): void {
    this.onDelete.emit();
  }
}
