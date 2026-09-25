import { Component, OnInit, AfterViewInit, Input, Output, EventEmitter, ElementRef, ViewChild, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeeContractService, EmployeeContract } from '../../../../services/employee-contract.service';
import { PositionService } from '../../../../services/position.service';

@Component({
  selector: 'app-service-modal-em',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './service-modal.component.html',
  styleUrls: ['./service-modal.component.scss']
})
export class ServiceModalComponent implements OnInit, AfterViewInit {
  @Input() isVisible: boolean = false;
  @Input() employeeId?: number;
  @Input() contract?: EmployeeContract;
  @Output() modalClosed = new EventEmitter<boolean>();

  @ViewChild('modalDialog', { static: false }) modalDialogRef!: ElementRef;
  @ViewChild('firstInput', { static: false }) firstInputRef!: ElementRef;

  serviceForm!: FormGroup;
  isEditMode: boolean = false;
  saving: boolean = false;

  positions: any[] = [];
  
  statusOptions = [
    { value: 'vigente', label: 'Vigente' },
    { value: 'vencido', label: 'Vencido' },
    { value: 'suspendido', label: 'Suspendido' },
    { value: 'finalizado', label: 'Finalizado' }
  ];

  typeOptions = [
    { value: 'servicio_em', label: 'Servicio Operador Equipo' },
    { value: 'contrato_em', label: 'Contrato Administrativo EM' },
    { value: 'orden_servicio', label: 'Orden de Servicio' }
  ];

  constructor(
    private fb: FormBuilder,
    private contractService: EmployeeContractService,
    private positionService: PositionService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadPositions();
    if (this.contract && this.contract.id) {
      this.isEditMode = true;
      this.populateForm();
    }
  }

  ngAfterViewInit(): void {
    this.applyModalStyles();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
      setTimeout(() => {
        this.applyModalStyles();
        this.focusFirstInput();
      }, 150);
    }
    
    if (changes['contract']) {
      if (this.contract && this.contract.id) {
        this.isEditMode = true;
        this.populateForm();
      } else {
        this.isEditMode = false;
        this.initializeForm();
      }
    }
  }

  private applyModalStyles(): void {
    if (this.modalDialogRef?.nativeElement) {
      const element = this.modalDialogRef.nativeElement;
      element.style.setProperty('max-width', '900px', 'important');
      element.style.setProperty('width', '90%', 'important');
      element.style.setProperty('margin', '1.75rem auto', 'important');
      element.focus();
    }
  }

  private focusFirstInput(): void {
    if (this.firstInputRef?.nativeElement) {
      this.firstInputRef.nativeElement.focus();
    }
  }

  private initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.serviceForm = this.fb.group({
      contract_number: ['', [Validators.required, Validators.maxLength(50)]],
      contract_type: ['servicio_em', Validators.required],
      start_date: [today, Validators.required],
      end_date: [''],
      position: ['', [Validators.required]],
      salary: [0, [Validators.required, Validators.min(0)]],
      status: ['vigente', Validators.required],
      notes: ['']
    });
  }

  private loadPositions(): void {
    this.positionService.getAll().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.positions = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        }
      }
    });
  }

  private populateForm(): void {
    if (!this.contract) return;
    this.serviceForm.patchValue({
      contract_number: this.contract.contract_number,
      contract_type: this.contract.contract_type,
      start_date: this.contract.start_date?.split('T')[0],
      end_date: this.contract.end_date?.split('T')[0],
      position: this.contract.position_id || this.contract.position?.id || '',
      salary: this.contract.salary,
      status: this.contract.status,
      notes: this.contract.notes
    });
  }

  onSubmit(): void {
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const formData = {
      ...this.serviceForm.value,
      employee_id: this.employeeId
    };

    const saveOperation = this.isEditMode && this.contract?.id
      ? this.contractService.updateContract(this.contract.id, formData)
      : this.contractService.createContract(formData);

    saveOperation.subscribe({
      next: (res) => {
        this.saving = false;
        if (res.success) {
          this.modalClosed.emit(true);
        }
      },
      error: () => this.saving = false
    });
  }

  onCancel(): void {
    this.modalClosed.emit(false);
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  hasError(fieldName: string): boolean {
    const field = this.serviceForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
