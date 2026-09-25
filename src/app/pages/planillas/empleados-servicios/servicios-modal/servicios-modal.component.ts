import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiciosFormComponent } from '../servicios-form/servicios-form.component';
import { DesignSystemService, ModalCrudConfig } from '../../../../services/design-system.service';

export interface EmployeeModalData {
  employee?: any;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-servicios-modal',
  standalone: true,
  imports: [
    CommonModule,
    ServiciosFormComponent
  ],
  templateUrl: './servicios-modal.component.html',
  styleUrl: './servicios-modal.component.scss'
})
export class ServiciosModalComponent implements OnInit, OnChanges {
  @Input() data: EmployeeModalData = { mode: 'create' };
  @Input() isVisible: boolean = false;
  @Output() modalClosed = new EventEmitter<boolean>();

  title: string = '';
  mc!: ModalCrudConfig;

  constructor(private dsService: DesignSystemService) {}

  ngOnInit(): void {
    this.mc = this.dsService.getModalCrudFor('planillas');
    this.updateTitle();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.updateTitle();
    }
  }

  private updateTitle(): void {
    if (this.mc) {
      this.title = this.data.mode === 'create'
        ? (this.mc.titleAdd + ' - Servicio')
        : (this.mc.titleEdit + ' - Servicio');
    } else {
      this.title = this.data.mode === 'create' ? 'Agregar Servicio' : 'Editar Servicio';
    }
  }

  onCancel(): void {
    this.modalClosed.emit(false);
  }

  onSave(): void {
    this.modalClosed.emit(true);
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }
}