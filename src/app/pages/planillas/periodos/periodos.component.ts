import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PayrollPeriodService, PayrollPeriod } from '../../../services/payroll-period.service';
import { NotificationService } from '../../../services/notification.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { PageHeaderComponent, CrudActionsComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-periodos',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTablesModule, PageHeaderComponent, CrudActionsComponent],
  templateUrl: './periodos.component.html',
  styleUrls: ['./periodos.component.scss']
})
export class PeriodosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  periods: PayrollPeriod[] = [];
  loading = false;
  showModal = false;
  showViewModal = false;
  isEditMode = false;
  selectedPeriod: PayrollPeriod | null = null;

  periodForm: PayrollPeriod = this.getEmptyForm();

  filterYear: number = new Date().getFullYear();
  filterStatus: string = '';

  months = [
    { value: 1, name: 'Enero' },
    { value: 2, name: 'Febrero' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' },
    { value: 5, name: 'Mayo' },
    { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' },
    { value: 11, name: 'Noviembre' },
    { value: 12, name: 'Diciembre' }
  ];

  statuses = [
    { value: 'draft', name: 'Borrador', color: 'secondary' },
    { value: 'calculated', name: 'Calculado', color: 'info' },
    { value: 'approved', name: 'Aprobado', color: 'success' },
    { value: 'closed', name: 'Cerrado', color: 'dark' }
  ];

  constructor(
    private payrollPeriodService: PayrollPeriodService,
    private notificationService: NotificationService,
    private dsService: DesignSystemService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.cv = this.dsService.getCrudViewFor('planillas');
    this.mc = this.dsService.getModalCrudFor('planillas');
    this.initDataTable();
    this.loadPeriods();
  }

  ngOnDestroy(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  initDataTable(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      processing: true,
      responsive: true,
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      order: [[1, 'asc']],
      columnDefs: [{ targets: -1, orderable: false, searchable: false }]
    };
  }

  loadPeriods(): void {
    this.loading = true;
    const filters: any = { paginate: false };
    if (this.filterYear) filters.year = this.filterYear;
    if (this.filterStatus) filters.status = this.filterStatus;

    this.payrollPeriodService.getPeriods(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.periods = Array.isArray(response.data) ? response.data : [];
          }
          this.loading = false;
          if (this.dtElement?.dtInstance) {
            this.dtElement.dtInstance.then((dtInstance: any) => {
              dtInstance.destroy();
              if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
            });
          } else {
            setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
          }
        },
        error: (error) => {
          console.error('Error loading periods:', error);
          this.notificationService.error('Error al cargar períodos');
          this.periods = [];
          this.loading = false;
          setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
        }
      });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.periodForm = this.getEmptyForm();
    this.onMonthChange();
    this.showModal = true;
  }

  openEditModal(period: PayrollPeriod): void {
    this.isEditMode = true;
    this.periodForm = {
      ...period,
      start_date: this.toDateOnly(period.start_date) ?? '',
      end_date: this.toDateOnly(period.end_date) ?? ''
    };
    this.showModal = true;
  }

  openViewModal(period: PayrollPeriod): void {
    this.selectedPeriod = period;
    this.showViewModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.periodForm = this.getEmptyForm();
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedPeriod = null;
  }

  savePeriod(): void {
    if (!this.validateForm()) return;

    this.loading = true;
    const operation = this.isEditMode
      ? this.payrollPeriodService.updatePeriod(this.periodForm.id!, this.periodForm)
      : this.payrollPeriodService.createPeriod(this.periodForm);

    operation.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(
              this.isEditMode ? 'Período actualizado exitosamente' : 'Período creado exitosamente'
            );
            this.closeModal();
            this.loadPeriods();
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error saving period:', error);
          this.notificationService.error(error.error?.message || 'Error al guardar el período');
          this.loading = false;
        }
      });
  }

  deletePeriod(period: PayrollPeriod): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Período';
    ref.componentInstance.message = `¿Está seguro de eliminar el período "${period.period_name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.loading = true;
        this.payrollPeriodService.deletePeriod(period.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.notificationService.success('Período eliminado exitosamente');
                this.loadPeriods();
              }
              this.loading = false;
            },
            error: (error) => {
              console.error('Error deleting period:', error);
              this.notificationService.error('Error al eliminar el período');
              this.loading = false;
            }
          });
      },
      () => {}
    );
  }

  validateForm(): boolean {
    if (!this.periodForm.period_name) {
      this.notificationService.error('El nombre del período es requerido');
      return false;
    }
    if (!this.periodForm.year || !this.periodForm.month) {
      this.notificationService.error('El año y mes son requeridos');
      return false;
    }
    if (!this.periodForm.start_date || !this.periodForm.end_date) {
      this.notificationService.error('Las fechas de inicio y fin son requeridas');
      return false;
    }
    return true;
  }

  getEmptyForm(): PayrollPeriod {
    const now = new Date();
    return {
      period_name: '',
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      start_date: '',
      end_date: '',
      status: 'draft',
      notes: ''
    };
  }

  getMonthName(month: number): string {
    const monthObj = this.months.find(m => m.value === month);
    return monthObj ? monthObj.name : '';
  }

  getStatusBadge(status: string): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? statusObj.color : 'secondary';
  }

  getStatusName(status: string): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? statusObj.name : status;
  }

  onYearChange(): void {
    this.loadPeriods();
  }

  onStatusChange(): void {
    this.loadPeriods();
  }

  onMonthChange(): void {
    const monthName = this.getMonthName(this.periodForm.month);
    this.periodForm.period_name = `${monthName} ${this.periodForm.year}`;

    const startDate = new Date(this.periodForm.year, this.periodForm.month - 1, 1);
    const endDate = new Date(this.periodForm.year, this.periodForm.month, 0);

    this.periodForm.start_date = startDate.toISOString().split('T')[0];
    this.periodForm.end_date = endDate.toISOString().split('T')[0];
  }

  /**
   * Convierte una fecha (ISO o string) al formato YYYY-MM-DD para input type="date".
   */
  private toDateOnly(value: string | undefined | null): string | null {
    if (value == null || value === '') return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }
}
