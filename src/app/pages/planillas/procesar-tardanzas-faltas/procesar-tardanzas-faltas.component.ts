import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AttendanceService, Attendance, AttendanceStatistics, AttendanceCalculation } from '../../../services/attendance.service';
import { EmployeeService, Employee, EmployeeResponse } from '../../../services/employee.service';
import { PayrollPeriodService, PayrollPeriod } from '../../../services/payroll-period.service';
import { ToastService } from '../../../services/toast.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { PageHeaderComponent, LoadingSpinnerComponent } from '../../../shared/components';

@Component({
  selector: 'app-procesar-tardanzas-faltas',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  templateUrl: './procesar-tardanzas-faltas.component.html',
  styleUrls: ['./procesar-tardanzas-faltas.component.scss']
})
export class ProcesarTardanzasFaltasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly breadcrumbs = [
    { label: 'Planillas', url: '/planillas' },
    { label: 'Procesar Tardanzas y Faltas' }
  ];

  cv!: CrudViewConfig;

  // Tabs
  activeTab: 'registro' | 'consulta' | 'calcular' | 'importar' | 'justificar' | 'debug' = 'registro';

  // Data
  employees: Employee[] = [];
  periods: PayrollPeriod[] = [];
  attendances: Attendance[] = [];
  pendingJustifications: Attendance[] = [];

  // Filters
  selectedEmployee: Employee | null = null;
  selectedPeriod: PayrollPeriod | null = null;
  selectedDate: string = new Date().toISOString().split('T')[0];
  filterStartDate: string = '';
  filterEndDate: string = '';
  filterStatus: string = '';

  // Justification form
  selectedAttendanceForJustify: Attendance | null = null;
  justificationText: string = '';
  submittingJustification: boolean = false;

  /** Asistencia seleccionada para ver detalle (modal ojito) */
  selectedAttendanceForView: Attendance | null = null;

  // Registro rápido
  quickEmployee: Employee | null = null;
  quickTime: string = new Date().toTimeString().slice(0, 5);
  registrationType: 'entry' | 'exit' = 'entry';

  // Cálculo de descuentos
  calculationResult: AttendanceCalculation | null = null;
  calculating: boolean = false;

  // Importación masiva
  importFile: File | null = null;
  importing: boolean = false;
  importResult: { imported_count: number; errors: any[] } | null = null;

  // Estadísticas
  statistics: AttendanceStatistics | null = null;

  // Loading states
  loading: boolean = false;
  loadingEmployees: boolean = false;
  loadingPeriods: boolean = false;
  loadingAttendances: boolean = false;

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalItems: number = 0;

  // Consultar Asistencias - paginación
  pageConsulta: number = 1;
  pageSizeConsulta: number = 10;
  pageSizeOptionsConsulta = [10, 25, 50, 100];

  @ViewChild('tabContent', { static: false }) tabContentRef!: ElementRef<HTMLDivElement>;
  @ViewChild('viewAttendanceModal') viewAttendanceModalRef!: ElementRef<HTMLDivElement>;

  private viewAttendanceModal: any;

  constructor(
    private attendanceService: AttendanceService,
    private employeeService: EmployeeService,
    private payrollPeriodService: PayrollPeriodService,
    private toastService: ToastService,
    private dsService: DesignSystemService
  ) {}

  ngOnInit(): void {
    this.cv = this.dsService.getCrudViewFor('planillas');
    this.initDataTableConsulta();
    this.loadEmployees();
    this.loadPeriods();
    this.loadCurrentMonthPeriod();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initDataTableConsulta(): void {
    this.pageSizeConsulta = this.cv?.defaultPageSize ?? 10;
  }

  get paginatedAttendances(): Attendance[] {
    const start = (this.pageConsulta - 1) * this.pageSizeConsulta;
    return this.attendances.slice(start, start + this.pageSizeConsulta);
  }

  get totalPagesConsulta(): number {
    return Math.max(1, Math.ceil(this.attendances.length / this.pageSizeConsulta));
  }

  get displayEndConsulta(): number {
    return Math.min(this.pageConsulta * this.pageSizeConsulta, this.attendances.length);
  }

  get displayStartConsulta(): number {
    return this.attendances.length === 0 ? 0 : (this.pageConsulta - 1) * this.pageSizeConsulta + 1;
  }

  get pageNumbersConsulta(): number[] {
    return Array.from({ length: this.totalPagesConsulta }, (_, i) => i + 1);
  }

  setPageConsulta(p: number): void {
    this.pageConsulta = Math.max(1, Math.min(p, this.totalPagesConsulta));
  }

  onPageSizeChangeConsulta(): void {
    this.pageConsulta = 1;
  }

  // ==================== TAB MANAGEMENT ====================

  setActiveTab(tab: 'registro' | 'consulta' | 'calcular' | 'importar' | 'justificar' | 'debug'): void {
    this.activeTab = tab;
    console.log('[ProcesarTardanzasFaltas] Tab clickeada:', tab, {
      activeTab: this.activeTab,
      empleados: this.employees?.length ?? 0,
      periodos: this.periods?.length ?? 0
    });
    setTimeout(() => this.scrollToTabs(), 0);
    
    if (tab === 'consulta') {
      this.loadAttendances();
      this.toastService.info(
        `Tab CONSULTA. Empleados: ${this.employees.length}, Períodos: ${this.periods.length}`,
        'DEBUG TABS'
      );
    } else if (tab === 'calcular' && !this.calculationResult) {
      // Cargar período actual por defecto
      this.loadCurrentMonthPeriod();
      this.toastService.info(
        `Tab CALCULAR. Empleados: ${this.employees.length}, Períodos: ${this.periods.length}`,
        'DEBUG TABS'
      );
    } else if (tab === 'justificar') {
      this.loadPendingJustifications();
      this.toastService.info(
        `Tab JUSTIFICAR. Pendientes: ${this.pendingJustifications.length}`,
        'DEBUG TABS'
      );
    } else if (tab === 'importar') {
      this.toastService.info(
        `Tab IMPORTAR. Archivo seleccionado: ${this.importFile ? this.importFile.name : 'ninguno'}`,
        'DEBUG TABS'
      );
    } else if (tab === 'debug') {
      this.toastService.info('Tab DEBUG activa', 'DEBUG TABS');
    }
  }

  private scrollToTabs(): void {
    if (this.tabContentRef?.nativeElement) {
      this.tabContentRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ==================== IMPORTAR DATOS ====================

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.importFile = null;
      return;
    }
    this.importFile = input.files[0];
    this.importResult = null;
  }

  importAttendancesFromFile(): void {
    if (!this.importFile) {
      this.toastService.error('Debe seleccionar un archivo', 'Error');
      return;
    }

    this.importing = true;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length <= 1) {
          this.toastService.error('El archivo no contiene registros', 'Error');
          this.importing = false;
          return;
        }

        const header = lines[0].split(';').map(h => h.trim().toLowerCase());
        const requiredColumns = ['employee_id', 'date', 'scheduled_entry_time', 'scheduled_exit_time', 'status'];
        const missing = requiredColumns.filter(col => !header.includes(col));
        if (missing.length > 0) {
          this.toastService.error('Faltan columnas requeridas en el archivo: ' + missing.join(', '), 'Error');
          this.importing = false;
          return;
        }

        const attendances: Partial<Attendance>[] = [];
        const errors: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          const values = line.split(';');
          if (values.length !== header.length) {
            errors.push({ row: i + 1, error: 'Número de columnas inválido' });
            continue;
          }

          const row: any = {};
          header.forEach((h, idx) => {
            row[h] = values[idx] !== undefined ? values[idx].trim() : '';
          });

          const employeeId = Number(row['employee_id']);
          const date = row['date'];
          const scheduledEntry = row['scheduled_entry_time'];
          const scheduledExit = row['scheduled_exit_time'];
          const status = row['status'];

          if (!employeeId || !date || !scheduledEntry || !scheduledExit || !status) {
            errors.push({ row: i + 1, error: 'Campos obligatorios incompletos' });
            continue;
          }

          const attendance: Partial<Attendance> = {
            employee_id: employeeId,
            date,
            scheduled_entry_time: scheduledEntry,
            scheduled_exit_time: scheduledExit,
            actual_entry_time: row['actual_entry_time'] || undefined,
            actual_exit_time: row['actual_exit_time'] || undefined,
            status,
            late_minutes: row['late_minutes'] ? Number(row['late_minutes']) : 0,
            early_departure_minutes: row['early_departure_minutes'] ? Number(row['early_departure_minutes']) : 0,
            hours_worked: row['hours_worked'] ? Number(row['hours_worked']) : 0,
            overtime_hours: row['overtime_hours'] ? Number(row['overtime_hours']) : 0,
            is_justified: row['is_justified'] === '1' || row['is_justified']?.toLowerCase() === 'true'
          };

          attendances.push(attendance);
        }

        if (attendances.length === 0) {
          this.toastService.error('No se encontraron registros válidos para importar', 'Error');
          this.importing = false;
          this.importResult = { imported_count: 0, errors };
          return;
        }

        this.attendanceService.importAttendances(attendances)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (resp) => {
              if (resp.success) {
                this.toastService.success('Asistencias importadas correctamente', 'Éxito');
                const importedCount = Array.isArray(resp.data?.imported) ? resp.data.imported.length : attendances.length;
                const apiErrors = resp.data?.errors || [];
                this.importResult = {
                  imported_count: importedCount,
                  errors: [...errors, ...apiErrors]
                };
                this.loadAttendances();
                this.loadStatistics();
              } else {
                this.toastService.error('No se pudieron importar las asistencias', 'Error');
                this.importResult = { imported_count: 0, errors: [...errors, resp.message || 'Error desconocido'] };
              }
              this.importing = false;
            },
            error: (err) => {
              console.error('Error importing attendances:', err);
              this.toastService.error('Error al importar asistencias', 'Error');
              this.importResult = { imported_count: 0, errors: [...errors, 'Error en el servidor'] };
              this.importing = false;
            }
          });
      } catch (e) {
        console.error('Error reading file:', e);
        this.toastService.error('El archivo no tiene el formato esperado', 'Error');
        this.importing = false;
      }
    };

    reader.onerror = () => {
      this.toastService.error('No se pudo leer el archivo', 'Error');
      this.importing = false;
    };

    reader.readAsText(this.importFile);
  }

  // ==================== LOAD DATA ====================

  loadEmployees(): void {
    this.loadingEmployees = true;
    this.employeeService.getEmployees({ status: 'active', per_page: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: EmployeeResponse) => {
          console.log('📥 Employees response:', response);
          if (response.success && response.data && response.data.employees) {
            this.employees = response.data.employees;
            console.log('✅ Employees loaded:', this.employees.length);
          } else {
            this.employees = [];
            console.warn('⚠️ No employees found in response');
          }
          this.loadingEmployees = false;
        },
        error: (error) => {
          console.error('❌ Error loading empleados:', error);
          this.toastService.error('Error al cargar empleados', 'Error');
          this.loadingEmployees = false;
        }
      });
  }

  loadPeriods(): void {
    this.loadingPeriods = true;
    this.payrollPeriodService.getPeriods()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Manejar respuesta paginada o array directo
            if (Array.isArray(response.data)) {
              this.periods = response.data;
            } else if (response.data && 'data' in response.data) {
              this.periods = response.data.data;
            } else {
              this.periods = [];
            }
          }
          this.loadingPeriods = false;
        },
        error: (error) => {
          console.error('Error loading periods:', error);
          this.toastService.error('Error al cargar períodos', 'Error');
          this.loadingPeriods = false;
        }
      });
  }

  loadCurrentMonthPeriod(): void {
    const now = new Date();
    const currentPeriod = this.periods.find(p => 
      p.year === now.getFullYear() && p.month === (now.getMonth() + 1)
    );
    if (currentPeriod) {
      this.selectedPeriod = currentPeriod;
    }
  }

  loadAttendances(): void {
    this.loadingAttendances = true;
    const params: any = {
      per_page: 1000
    };

    if (this.selectedEmployee) {
      params.employee_id = this.selectedEmployee.id;
    }
    if (this.filterStartDate) {
      params.start_date = this.filterStartDate;
    }
    if (this.filterEndDate) {
      params.end_date = this.filterEndDate;
    }
    if (this.filterStatus) {
      params.status = this.filterStatus;
    }

    this.attendanceService.getAttendances(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingAttendances = false;
          if (response.success) {
            if (Array.isArray(response.data)) {
              this.attendances = response.data;
            } else if (response.data && 'data' in response.data) {
              this.attendances = response.data.data;
            } else {
              this.attendances = [];
            }
          } else {
            this.attendances = [];
          }
          this.pageConsulta = 1;
        },
        error: () => {
          this.loadingAttendances = false;
          this.attendances = [];
        }
      });
  }

  loadStatistics(): void {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    this.attendanceService.getStatistics(startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.statistics = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading statistics:', error);
        }
      });
  }

  loadPendingJustifications(): void {
    const params: any = {
      per_page: 50,
      is_justified: false
    };
    if (this.filterStartDate) params.start_date = this.filterStartDate;
    if (this.filterEndDate) params.end_date = this.filterEndDate;
    if (this.selectedEmployee) params.employee_id = this.selectedEmployee.id;

    this.attendanceService.getAttendances(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            if (Array.isArray(response.data)) {
              this.pendingJustifications = response.data.filter((a: Attendance) => (a.status === 'late' || a.status === 'absent') && !a.is_justified);
            } else if (response.data && 'data' in response.data) {
              this.pendingJustifications = response.data.data.filter((a: Attendance) => (a.status === 'late' || a.status === 'absent') && !a.is_justified);
            } else {
              this.pendingJustifications = [];
            }
          }
        },
        error: (error) => {
          console.error('Error loading pending justifications:', error);
          this.toastService.error('Error al cargar pendientes de justificación', 'Error');
        }
      });
  }

  openJustify(attendance: Attendance): void {
    this.selectedAttendanceForJustify = attendance;
    this.justificationText = '';
  }

  /** Abre el modal de detalle de asistencia (botón ojito) */
  openViewDetail(attendance: Attendance): void {
    this.selectedAttendanceForView = attendance;
    if (typeof (window as any).bootstrap !== 'undefined' && this.viewAttendanceModalRef?.nativeElement) {
      this.viewAttendanceModal = new (window as any).bootstrap.Modal(this.viewAttendanceModalRef.nativeElement);
      this.viewAttendanceModal.show();
    }
  }

  closeViewDetail(): void {
    this.selectedAttendanceForView = null;
    if (this.viewAttendanceModal) {
      this.viewAttendanceModal.hide();
    }
  }

  submitJustification(): void {
    if (!this.selectedAttendanceForJustify?.id) {
      this.toastService.error('Seleccione un registro', 'Error');
      return;
    }
    if (!this.justificationText.trim()) {
      this.toastService.error('Ingrese una justificación', 'Error');
      return;
    }

    this.submittingJustification = true;
    this.attendanceService.justifyAttendance(this.selectedAttendanceForJustify.id, {
      justification: this.justificationText
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (resp) => {
        if (resp.success) {
          this.toastService.success('Justificación registrada', 'Éxito');
          this.selectedAttendanceForJustify = null;
          this.justificationText = '';
          this.loadPendingJustifications();
        }
        this.submittingJustification = false;
      },
      error: (err) => {
        console.error('Error submitting justification:', err);
        this.toastService.error('No se pudo registrar la justificación', 'Error');
        this.submittingJustification = false;
      }
    });
  }

  // ==================== REGISTRO RÁPIDO ====================

  registerQuickAttendance(): void {
    if (!this.quickEmployee || !this.quickEmployee.id) {
      this.toastService.error('Debe seleccionar un empleado', 'Error');
      return;
    }

    if (!this.quickTime) {
      this.toastService.error('Debe ingresar la hora', 'Error');
      return;
    }

    this.loading = true;
    const data = {
      employee_id: this.quickEmployee.id!,
      time: this.quickTime,
      device: 'web' as const
    };

    const request$ = this.registrationType === 'entry' 
      ? this.attendanceService.registerEntry(data)
      : this.attendanceService.registerExit(data);

    request$.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const action = this.registrationType === 'entry' ? 'Entrada' : 'Salida';
            this.toastService.success(`${action} registrada exitosamente`, 'Éxito');
            
            // Reset form
            this.quickTime = new Date().toTimeString().slice(0, 5);
            
            // Reload data
            if (this.activeTab === 'consulta') {
              this.loadAttendances();
            }
            this.loadStatistics();
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error registering attendance:', error);
          this.toastService.error('Error al registrar asistencia', 'Error');
          this.loading = false;
        }
      });
  }

  // ==================== CALCULAR DESCUENTOS ====================

  calculateDiscounts(): void {
    if (!this.selectedEmployee || !this.selectedEmployee.id) {
      this.toastService.error('Debe seleccionar un empleado', 'Error');
      return;
    }

    if (!this.selectedPeriod || !this.selectedPeriod.id) {
      this.toastService.error('Debe seleccionar un período', 'Error');
      return;
    }

    this.calculating = true;
    this.attendanceService.calculateDiscounts(this.selectedEmployee.id, this.selectedPeriod.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.calculationResult = response;
            this.toastService.success('Descuentos calculados exitosamente', 'Éxito');
          }
          this.calculating = false;
        },
        error: (error) => {
          console.error('Error calculating discounts:', error);
          this.toastService.error('Error al calcular descuentos', 'Error');
          this.calculating = false;
        }
      });
  }

  clearCalculation(): void {
    this.calculationResult = null;
    this.selectedEmployee = null;
  }

  // ==================== FILTERS ====================

  applyFilters(): void {
    this.currentPage = 1;
    this.loadAttendances();
  }

  get Math() {
    return Math;
  }

  clearFilters(): void {
    this.selectedEmployee = null;
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.filterStatus = '';
    this.currentPage = 1;
    this.loadAttendances();
  }

  // ==================== PAGINATION ====================

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadAttendances();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadAttendances();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  // ==================== HELPERS ====================

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      'present': 'badge-success',
      'late': 'badge-warning',
      'absent': 'badge-danger',
      'justified_absent': 'badge-info',
      'medical_leave': 'badge-secondary',
      'vacation': 'badge-primary',
      'permission': 'badge-info',
      'remote': 'badge-dark',
      'holiday': 'badge-light'
    };
    return classes[status] || 'badge-secondary';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'present': 'Presente',
      'late': 'Tardanza',
      'absent': 'Falta',
      'justified_absent': 'Falta Justificada',
      'medical_leave': 'Descanso Médico',
      'vacation': 'Vacaciones',
      'permission': 'Permiso',
      'remote': 'Remoto',
      'holiday': 'Feriado'
    };
    return labels[status] || status;
  }

  /** Formatea hora para mostrar HH:mm (soporta ISO datetime o "HH:mm"/"HH:mm:ss") */
  formatTime(time: string | undefined): string {
    if (!time || typeof time !== 'string') return '-';
    const s = time.trim();
    if (s.includes('T')) {
      const part = s.split('T')[1] || '';
      return part.substring(0, 5);
    }
    return s.substring(0, 5);
  }

  formatDate(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-PE');
  }

  /** Etiqueta del período: mes, año y rango de días (no solo el año) */
  getPeriodLabel(period: PayrollPeriod | null): string {
    if (!period) return '';
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthName = period.month && period.month >= 1 && period.month <= 12
      ? monthNames[period.month - 1]
      : `Mes ${period.month || '-'}`;
    const start = period.start_date ? this.formatDate(period.start_date) : '-';
    const end = period.end_date ? this.formatDate(period.end_date) : '-';
    return `${monthName} ${period.year} — ${start} al ${end}`;
  }

  /** Rango de fechas del período del resultado de cálculo (días) */
  getCalculationPeriodRange(): string {
    const p = this.calculationResult?.period;
    if (!p?.start_date || !p?.end_date) return '';
    return `${this.formatDate(p.start_date)} – ${this.formatDate(p.end_date)}`;
  }

  /** Minutos de tardanza a texto "X h Y min" */
  formatMinutesToHours(minutes: number | undefined | null): string {
    if (minutes == null || minutes === 0) return '0 min';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m} min`;
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
  }

  formatCurrency(value: number | string | undefined | null): string {
    if (value === undefined || value === null || value === '') return 'S/ 0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num as number)) return 'S/ 0.00';
    return `S/ ${(num as number).toFixed(2)}`;
  }

  getMonthlySalary(): number {
    const cr = this.calculationResult;
    if (!cr) return 0;
    const monthly: any = cr.monthly_salary as any;
    const base: any = cr.employee?.base_salary as any;
    const monthlyNum = typeof monthly === 'string' ? parseFloat(monthly) : monthly;
    const baseNum = typeof base === 'string' ? parseFloat(base) : base;
    if (typeof monthlyNum === 'number' && !isNaN(monthlyNum)) return monthlyNum;
    if (typeof baseNum === 'number' && !isNaN(baseNum)) return baseNum;
    return 0;
  }

  getNetSalary(): number {
    const monthly = this.getMonthlySalary();
    const tdAny: any = this.calculationResult?.discounts?.total_discount as any;
    const td = typeof tdAny === 'string' ? parseFloat(tdAny) : (typeof tdAny === 'number' ? tdAny : 0);
    return monthly - (isNaN(td) ? 0 : td);
  }
}
