import { Component, OnInit, AfterViewInit, Input, Output, EventEmitter, ElementRef, ViewChild, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeeContractService, EmployeeContract } from '../../../../services/employee-contract.service';
import { SalaryScaleService, SalaryScale } from '../../../../services/salary-scale.service';
import { CostCenterService, CostCenter } from '../../../../services/cost-center.service';
import { PositionService } from '../../../../services/position.service';
import { PayrollTypeService, PayrollType } from '../../../../services/payroll-type.service';

@Component({
  selector: 'app-servicios-contract-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './servicios-contract-modal.component.html',
  styleUrls: ['./servicios-contract-modal.component.scss']
})
export class ServiciosContractModalComponent implements OnInit, AfterViewInit {
  @Input() isVisible: boolean = false;
  @Input() employeeId?: number;
  @Input() contract?: EmployeeContract;
  @Output() modalClosed = new EventEmitter<boolean>();

  @ViewChild('modalDialog', { static: false }) modalDialogRef!: ElementRef;
  @ViewChild('firstInput', { static: false }) firstInputRef!: ElementRef;

  contractForm!: FormGroup;
  isEditMode: boolean = false;
  loading: boolean = false;
  saving: boolean = false;
  uploadingFile: boolean = false;

  // Estilos para el modal (ventana más amplia)
  modalDialogStyles = {
    'max-width': '1000px',
    'width': '90%',
    'margin': '1.75rem auto'
  };

  // Dropdowns
  salaryScales: SalaryScale[] = [];
  costCenters: CostCenter[] = [];
  positions: any[] = [];
  payrollTypes: PayrollType[] = [];
  
  // File upload
  selectedFile: File | null = null;
  filePreview: string | null = null;

  // Options (mantener como fallback si no hay datos del backend)
  contractTypes: { value: string; label: string; }[] = [];

  workSchedules = [
    { value: 'diurno', label: 'Diurno' },
    { value: 'nocturno', label: 'Nocturno' },
    { value: 'mixto', label: 'Mixto' },
    { value: 'rotativo', label: 'Rotativo' }
  ];

  statusOptions = [
    { value: 'vigente', label: 'Vigente' },
    { value: 'vencido', label: 'Vencido' },
    { value: 'renovado', label: 'Renovado' },
    { value: 'rescindido', label: 'Rescindido' },
    { value: 'suspendido', label: 'Suspendido' }
  ];

  constructor(
    private fb: FormBuilder,
    private contractService: EmployeeContractService,
    private salaryScaleService: SalaryScaleService,
    private costCenterService: CostCenterService,
    private positionService: PositionService,
    private payrollTypeService: PayrollTypeService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    console.log('🔄 ContractModal ngOnInit - Contrato:', this.contract);
    this.loadDropdownData();
    if (this.contract && this.contract.id) {
      console.log('✅ Modo EDICIÓN detectado en ngOnInit');
      this.isEditMode = true;
      this.populateForm();
    } else {
      console.log('✅ Modo NUEVO detectado en ngOnInit');
      this.isEditMode = false;
    }
  }

  ngAfterViewInit(): void {
    // Aplicar estilos directamente al DOM cuando el componente se renderiza
    this.applyModalStyles();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 ═══════════════════════════════════════');
    console.log('🔄 ContractModal ngOnChanges detectado');
    console.log('🔄 ═══════════════════════════════════════');
    console.log('📦 Todos los Changes:', changes);
    console.log('👁️ isVisible actual:', this.isVisible);
    console.log('👤 employeeId actual:', this.employeeId);
    console.log('📄 contract actual:', this.contract);
    
    if (changes['isVisible']) {
      console.log('👁️ Cambio detectado en isVisible');
      console.log('   - Valor anterior:', changes['isVisible'].previousValue);
      console.log('   - Valor actual:', changes['isVisible'].currentValue);
      console.log('   - ¿Es primer cambio?:', changes['isVisible'].firstChange);
      
      if (this.isVisible) {
        console.log('✅ Modal debería estar VISIBLE ahora');
        // Forzar aplicación de estilos y FOCO cuando el modal se hace visible
        setTimeout(() => {
          this.applyModalStyles();
          this.focusFirstInput();
        }, 150);
      } else {
        console.log('❌ Modal debería estar OCULTO ahora');
      }
    }
    
    // Detectar cambios en el contrato
    if (changes['contract']) {
      console.log('📄 Cambio detectado en contract Input');
      console.log('📄 Valor anterior:', changes['contract'].previousValue);
      console.log('📄 Valor actual:', changes['contract'].currentValue);
      console.log('📄 this.contract:', this.contract);
      
      if (this.contract && this.contract.id) {
        console.log('✅ Modo EDICIÓN - Contrato ID:', this.contract.id);
        this.isEditMode = true;
        console.log('🔄 Llamando a populateForm()...');
        this.populateForm();
        console.log('✅ populateForm() completado');
      } else {
        console.log('✅ Modo NUEVO - Sin contrato o sin ID');
        this.isEditMode = false;
        this.initializeForm();
      }
    }
  }

  private applyModalStyles(): void {
    if (this.modalDialogRef?.nativeElement) {
      const element = this.modalDialogRef.nativeElement;
      element.style.setProperty('max-width', '1000px', 'important');
      element.style.setProperty('width', '90%', 'important');
      element.style.setProperty('margin', '1.75rem auto', 'important');
      
      // Asegurarse de que el modal atrape el teclado
      element.focus();
    }
  }

  private focusFirstInput(): void {
    if (this.firstInputRef?.nativeElement) {
      this.firstInputRef.nativeElement.focus();
      console.log('🎯 Foco aplicado al primer campo del contrato');
    }
  }

  private initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];
    
    this.contractForm = this.fb.group({
      contract_number: ['', [Validators.required, Validators.maxLength(50)]],
      contract_type: [{ value: 'servicio', disabled: true }, Validators.required],
      start_date: [today, Validators.required],
      end_date: ['', Validators.required], // Requerido para servicios
      position: ['', [Validators.required, Validators.maxLength(150)]],
      salary: [0, [Validators.required, Validators.min(0)]],
      cost_center_id: [''],
      weekly_hours: [48, [Validators.required, Validators.min(1), Validators.max(168)]],
      work_schedule: ['diurno', Validators.required],
      special_conditions: [''],
      status: ['vigente', Validators.required],
      signed_date: [today],
      signed_by: [''],
      notes: ['']
    });
  }

  private loadDropdownData(): void {
    // Cargar tipos de planilla
    this.payrollTypeService.getAll().subscribe({
      next: (response: any) => {
        if (response.success) {
          const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
          this.payrollTypes = data.filter((pt: PayrollType) => pt.is_active);
          
          // Mapear tipos de planilla a contractTypes para el dropdown
          this.contractTypes = this.payrollTypes.map(pt => ({
            value: pt.code,
            label: pt.name
          }));

          // Asegurar que 'Servicio' existe en las opciones si no vino del backend
          if (!this.contractTypes.find(ct => ct.value === 'servicio')) {
            this.contractTypes.push({ value: 'servicio', label: 'Servicio' });
          }
          
          console.log('✅ Tipos de planilla cargados:', this.payrollTypes.length);
        }
      },
      error: (error) => {
        console.error('Error loading payroll types:', error);
        // Fallback a valores por defecto si falla la carga
        this.contractTypes = [
          { value: 'indefinido', label: 'Indefinido' },
          { value: 'plazo_fijo', label: 'Plazo Fijo' },
          { value: 'temporal', label: 'Temporal' },
          { value: 'servicio', label: 'Servicio' },
          { value: 'locacion', label: 'Locación de Servicios' },
          { value: 'cas', label: 'CAS' },
          { value: 'practicas', label: 'Prácticas' }
        ];
      }
    });

    // Cargar cargos/posiciones
    this.positionService.getAll().subscribe({
      next: (response: any) => {
        if (response.success) {
          if (Array.isArray(response.data)) {
            this.positions = response.data;
          } else if (response.data?.data) {
            this.positions = response.data.data;
          }
          console.log('✅ Cargos cargados:', this.positions.length);
        }
      },
      error: (error) => console.error('Error loading positions:', error)
    });

    // Cargar escalas salariales
    this.salaryScaleService.getAll().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.salaryScales = response.data?.data || response.data || [];
        }
      },
      error: (error) => console.error('Error loading salary scales:', error)
    });

    // Cargar centros de costo
    this.costCenterService.getAll().subscribe({
      next: (response: any) => {
        if (response.success) {
          if (Array.isArray(response.data)) {
            this.costCenters = response.data;
          } else if (response.data?.data) {
            this.costCenters = response.data.data;
          }
        }
      },
      error: (error) => console.error('Error loading cost centers:', error)
    });
  }

  private populateForm(): void {
    if (!this.contract) return;

    // Helper function to format date for input[type="date"]
    const formatDateForInput = (dateString: string | null | undefined): string => {
      if (!dateString) return '';
      // Convert ISO string to YYYY-MM-DD format
      return dateString.split('T')[0];
    };

    console.log('📝 Populando formulario con datos del contrato:');
    console.log('📅 Fecha inicio original:', this.contract.start_date);
    console.log('📅 Fecha fin original:', this.contract.end_date);
    console.log('📅 Fecha renovación original:', this.contract.renewal_date);
    console.log('📅 Fecha firma original:', this.contract.signed_date);

    this.contractForm.patchValue({
      contract_number: this.contract.contract_number,
      contract_type: 'servicio',
      start_date: formatDateForInput(this.contract.start_date),
      end_date: formatDateForInput(this.contract.end_date),
      position: this.contract.position_id || this.contract.position?.id || '',
      salary: this.contract.salary,
      cost_center_id: this.contract.cost_center_id,
      weekly_hours: this.contract.weekly_hours,
      work_schedule: this.contract.work_schedule,
      special_conditions: this.contract.special_conditions,
      status: this.contract.status,
      signed_date: formatDateForInput(this.contract.signed_date),
      signed_by: this.contract.signed_by,
      notes: this.contract.notes
    });

    console.log('✅ Formulario poblado. Valores de fechas:');
    console.log('📅 start_date:', this.contractForm.get('start_date')?.value);
    console.log('📅 end_date:', this.contractForm.get('end_date')?.value);
    console.log('📅 renewal_date:', this.contractForm.get('renewal_date')?.value);
    console.log('📅 signed_date:', this.contractForm.get('signed_date')?.value);

    if (this.contract.document_path) {
      this.filePreview = this.contract.document_path;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      
      // Validar tipo de archivo
      const allowedTypes = ['application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/png'];
      
      if (!allowedTypes.includes(this.selectedFile.type)) {
        alert('Solo se permiten archivos PDF, DOC, DOCX, JPG o PNG');
        this.selectedFile = null;
        input.value = '';
        return;
      }

      // Validar tamaño (máx 10MB)
      if (this.selectedFile.size > 10 * 1024 * 1024) {
        alert('El archivo no debe superar los 10MB');
        this.selectedFile = null;
        input.value = '';
        return;
      }

      this.filePreview = this.selectedFile.name;
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.filePreview = null;
  }

  onSubmit(): void {
    if (this.contractForm.invalid) {
      Object.keys(this.contractForm.controls).forEach(key => {
        const control = this.contractForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    this.saving = true;
    const formData = {
      ...this.contractForm.getRawValue(), // Para incluir contract_type deshabilitado
      employee_id: this.employeeId,
      contract_type: 'servicio' // Asegurar que siempre sea servicio
    };

    console.log('💾 ═══════════════════════════════════════');
    console.log('💾 GUARDANDO CONTRATO');
    console.log('💾 ═══════════════════════════════════════');
    console.log('📝 Modo:', this.isEditMode ? 'EDITAR' : 'NUEVO');
    console.log('🆔 Contract ID:', this.contract?.id);
    console.log('📦 Datos a enviar:', formData);
    console.log('📦 Datos a enviar (JSON):', JSON.stringify(formData, null, 2));
    console.log('📋 Valores del formulario:');
    Object.keys(this.contractForm.controls).forEach(key => {
      const control = this.contractForm.get(key);
      console.log(`   - ${key}:`, control?.value, `(valid: ${control?.valid})`);
    });

    const saveOperation = this.isEditMode && this.contract?.id
      ? this.contractService.updateContract(this.contract.id, formData)
      : this.contractService.createContract(formData);

    saveOperation.subscribe({
      next: (response) => {
        if (response.success) {
          // Si hay archivo, subirlo
          if (this.selectedFile && response.data.id) {
            this.uploadFile(response.data.id);
          } else {
            this.saving = false;
            alert(this.isEditMode ? 'Contrato actualizado exitosamente' : 'Contrato creado exitosamente');
            this.modalClosed.emit(true);
          }
        }
      },
      error: (error) => {
        console.error('❌ ═══════════════════════════════════════');
        console.error('❌ ERROR AL GUARDAR CONTRATO');
        console.error('❌ ═══════════════════════════════════════');
        console.error('❌ Status:', error.status);
        console.error('❌ Error completo:', error);
        console.error('❌ Error.error:', error.error);
        console.error('❌ Errores de validación:', error.error?.errors);
        console.error('❌ Mensaje del backend:', error.error?.message);
        this.saving = false;
        
        // Mostrar errores de validación si existen
        if (error.status === 422 && error.error?.errors) {
          const errorMessages = Object.entries(error.error.errors)
            .map(([field, messages]: [string, any]) => `• ${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          console.error('❌ Mensajes formateados:', errorMessages);
          alert('❌ Errores de validación:\n\n' + errorMessages);
        } else {
          alert('❌ Error al guardar el contrato: ' + (error.error?.message || 'Error desconocido'));
        }
      }
    });
  }

  private uploadFile(contractId: number): void {
    if (!this.selectedFile) {
      this.saving = false;
      return;
    }

    this.uploadingFile = true;
    this.contractService.uploadDocument(contractId, this.selectedFile).subscribe({
      next: (response) => {
        this.uploadingFile = false;
        this.saving = false;
        if (response.success) {
          alert('Contrato y documento guardados exitosamente');
          this.modalClosed.emit(true);
        }
      },
      error: (error) => {
        console.error('Error uploading file:', error);
        this.uploadingFile = false;
        this.saving = false;
        alert('Contrato guardado pero hubo un error al subir el documento');
        this.modalClosed.emit(true);
      }
    });
  }

  onCancel(): void {
    if (confirm('¿Está seguro de cancelar? Los cambios no guardados se perderán.')) {
      this.modalClosed.emit(false);
    }
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  hasError(fieldName: string): boolean {
    const field = this.contractForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getError(fieldName: string): string {
    const field = this.contractForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
    if (field.errors['max']) return `Valor máximo: ${field.errors['max'].max}`;
    if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;

    return 'Campo inválido';
  }

  generateContractNumber(): void {
    if (!this.employeeId) return;
    
    // Generar número de contrato automático
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const contractNumber = `CONT-${this.employeeId}-${year}${month}-${random}`;
    this.contractForm.patchValue({ contract_number: contractNumber });
  }

  generateWordDocument(): void {
    if (!this.contract?.id) {
      alert('Debe guardar el contrato primero antes de generar el documento Word');
      return;
    }

    if (confirm('¿Desea generar un documento Word con los datos del contrato?')) {
      this.saving = true;
      this.contractService.generateContractDocument(this.contract.id).subscribe({
        next: (response) => {
          this.saving = false;
          if (response.success) {
            alert('Documento Word generado exitosamente');
            // Descargar automáticamente
            window.open(response.data.download_url, '_blank');
          }
        },
        error: (error) => {
          this.saving = false;
          console.error('Error generating document:', error);
          alert('Error al generar el documento Word');
        }
      });
    }
  }
}

