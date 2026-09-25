import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DesignSystemService, ConfirmDialogConfig } from '../../../services/design-system.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent implements OnInit {
  @Input() title = 'Confirmar Acción';
  @Input() message = '¿Estás seguro de realizar esta acción?';
  @Input() detail = '';
  @Input() confirmText = 'Confirmar';
  @Input() cancelText = 'Cancelar';
  @Input() confirmClass = 'btn-danger';
  @Input() confirmIcon = 'fas fa-check';
  @Input() type: 'danger' | 'warning' | 'info' = 'danger';
  @Input() subsystem = '';

  cfg!: ConfirmDialogConfig;

  constructor(
    public activeModal: NgbActiveModal,
    private ds: DesignSystemService
  ) {}

  ngOnInit(): void {
    this.cfg = this.subsystem
      ? this.ds.getConfirmDialogFor(this.subsystem)
      : this.ds.confirmDialog;
  }

  get headerBg(): string {
    switch (this.type) {
      case 'danger': return this.cfg.dangerBg;
      case 'warning': return this.cfg.warningBg;
      case 'info': return this.cfg.infoBg;
    }
  }

  get headerTextColor(): string {
    switch (this.type) {
      case 'danger': return this.cfg.dangerText;
      case 'warning': return this.cfg.warningText;
      case 'info': return this.cfg.infoText;
    }
  }

  get iconClass(): string {
    switch (this.type) {
      case 'danger': return 'fas fa-exclamation-triangle';
      case 'warning': return 'fas fa-exclamation-circle';
      case 'info': return 'fas fa-info-circle';
    }
  }

  confirm(): void { this.activeModal.close('confirmed'); }
  cancel(): void { this.activeModal.dismiss('cancel'); }
}
