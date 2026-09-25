/**
 * CRUD Reglas de Asistencia.
 * Implementado con el patrón de diseño CRUD Planillas (DataTables + modales + GestionTablasBaseService).
 * Configuración dinámica: colores, posición, visibilidad de botones (CrudLayoutService).
 * Ver: docs/PATRON_CRUD_PLANILLAS.md
 */
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataTablesModule } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { AttendanceRuleService, AttendanceRule } from '../../../services/attendance-rule.service';
import { CrudLayoutService, CrudLayoutConfig, CrudThemeConfig } from '../../../services/crud-layout.service';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent, ConfirmDialogComponent, LoadingSpinnerComponent } from '../../../shared/components';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';

const SCREEN_KEY = 'reglas-asistencia';

@Component({
  selector: 'app-reglas-asistencia',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DataTablesModule,
    PageHeaderComponent,
    CrudActionsComponent,
    StatusBadgeComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './reglas-asistencia.component.html',
  styleUrls: ['./reglas-asistencia.component.scss']
})
export class ReglasAsistenciaComponent implements OnInit, OnDestroy {
  readonly breadcrumbs = [
    { label: 'Planillas', url: '/planillas' },
    { label: 'Reglas de Asistencia' }
  ];

  reglas: AttendanceRule[] = [];
  form!: FormGroup;
  selected: AttendanceRule | null = null;
  isEdit = false;
  saving = false;
  loading = false;

  layoutConfig!: CrudLayoutConfig;
  presetThemes: { name: string; theme: Partial<CrudThemeConfig> }[] = [];
  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  @ViewChild('editModal') editModalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;
  @ViewChild('configModal') configModalRef!: ElementRef;
  private editModal: any;
  private viewModal: any;
  private configModal: any;

  constructor(
    private service: AttendanceRuleService,
    private fb: FormBuilder,
    private crudLayout: CrudLayoutService,
    private modalService: NgbModal,
    private dsService: DesignSystemService
  ) { this.initForm(); }

  ngOnInit(): void {
    this.cv = this.dsService.getCrudViewFor('planillas');
    this.mc = this.dsService.getModalCrudFor('planillas');
    this.layoutConfig = this.crudLayout.getConfig(SCREEN_KEY);
    this.presetThemes = this.crudLayout.getPresetThemes();
    this.initDataTable();
    this.load();
  }
  ngOnDestroy(): void { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.complete(); }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      late_tolerance_minutes: [10, Validators.required],
      late_max_minutes: [60, Validators.required],
      discount_per_late_minute: [0],
      lates_before_absence: [3, Validators.required],
      accumulate_lates: [true],
      discount_per_absence_day: [1, Validators.required],
      discount_absence_from_salary: [true],
      absence_day_value_divisor: [30, Validators.required],
      early_departure_tolerance_minutes: [10, Validators.required],
      discount_per_early_minute: [0],
      application_period: ['monthly'],
      is_active: [true],
      is_default: [false]
    });
  }

  initDataTable(): void {
    const pageLength = this.cv?.defaultPageSize ?? 10;
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength,
      processing: true,
      responsive: true,
      stateSave: true,
      stateDuration: 0,
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[0, 'asc']],
      columnDefs: [ { targets: -1, orderable: false, searchable: false } ]
    };
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (resp) => {
        this.loading = false;
        if (resp.success) {
          const data: any = resp.data;
          this.reglas = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.reglas = [];
        }
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      },
      error: () => {
        this.loading = false;
        this.reglas = [];
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      }
    });
  }

  reloadTable(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (resp) => {
        this.loading = false;
        if (resp.success) {
          const data: any = resp.data;
          this.reglas = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.reglas = [];
        }
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      },
      error: () => {
        this.loading = false;
        this.reglas = [];
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      }
    });
  }

  openCreate(): void {
    this.isEdit = false;
    this.selected = null;
    this.form.reset({
      name: '', description: '', late_tolerance_minutes: 10, late_max_minutes: 60, discount_per_late_minute: 0,
      lates_before_absence: 3, accumulate_lates: true, discount_per_absence_day: 1, discount_absence_from_salary: true,
      absence_day_value_divisor: 30, early_departure_tolerance_minutes: 10, discount_per_early_minute: 0,
      application_period: 'monthly', is_active: true, is_default: false
    });
    // @ts-ignore
    this.editModal = new (window as any).bootstrap.Modal(this.editModalRef.nativeElement);
    this.editModal.show();
  }

  openEdit(item: AttendanceRule): void {
    this.isEdit = true;
    this.selected = item;
    this.form.patchValue(item);
    // @ts-ignore
    this.editModal = new (window as any).bootstrap.Modal(this.editModalRef.nativeElement);
    this.editModal.show();
  }

  openView(item: AttendanceRule): void {
    this.selected = item;
    // @ts-ignore
    this.viewModal = new (window as any).bootstrap.Modal(this.viewModalRef.nativeElement);
    this.viewModal.show();
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const payload = this.form.value as Partial<AttendanceRule>;
    const op = this.isEdit && this.selected?.id
      ? this.service.update(this.selected.id!, payload)
      : this.service.create(payload);

    op.subscribe({
      next: (resp) => {
        if (resp.success) {
          this.reloadTable();
          this.saving = false;
          this.closeEdit();
        }
      },
      error: () => { this.saving = false; }
    });
  }

  delete(item: AttendanceRule): void {
    if (!item.id) return;
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Regla de Asistencia';
    ref.componentInstance.message = `¿Estás seguro de eliminar "${item.name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.result.then(
      () => this.service.delete(item.id!).subscribe({ next: () => this.reloadTable() }),
      () => {}
    );
  }

  setDefault(item: AttendanceRule): void {
    if (!item.id) return;
    this.service.setDefault(item.id).subscribe({ next: () => this.reloadTable() });
  }

  closeEdit(): void { if (this.editModal) this.editModal.hide(); }
  closeView(): void { if (this.viewModal) this.viewModal.hide(); }

  openLayoutConfig(): void {
    setTimeout(() => {
      if (this.configModalRef?.nativeElement) {
        if (!this.configModal) {
          this.configModal = new (window as any).bootstrap.Modal(this.configModalRef.nativeElement);
        }
        this.configModal.show();
      }
    }, 0);
  }

  closeLayoutConfig(): void {
    if (this.configModal) this.configModal.hide();
  }

  applyPresetTheme(preset: { theme: Partial<CrudThemeConfig> }): void {
    this.crudLayout.setTheme(preset.theme, SCREEN_KEY);
    this.layoutConfig = this.crudLayout.getConfig(SCREEN_KEY);
  }

  setActionsPosition(pos: 'start' | 'end'): void {
    this.crudLayout.setLayout({ actionsPosition: pos }, SCREEN_KEY);
    this.layoutConfig = this.crudLayout.getConfig(SCREEN_KEY);
  }

  setModalSize(size: string): void {
    this.crudLayout.setLayout({ modalSize: size }, SCREEN_KEY);
    this.layoutConfig = this.crudLayout.getConfig(SCREEN_KEY);
  }

  setShowView(v: boolean): void {
    this.crudLayout.setLayout({ showViewButton: v }, SCREEN_KEY);
    this.layoutConfig = this.crudLayout.getConfig(SCREEN_KEY);
  }
  setShowEdit(v: boolean): void {
    this.crudLayout.setLayout({ showEditButton: v }, SCREEN_KEY);
    this.layoutConfig = this.crudLayout.getConfig(SCREEN_KEY);
  }
  setShowDelete(v: boolean): void {
    this.crudLayout.setLayout({ showDeleteButton: v }, SCREEN_KEY);
    this.layoutConfig = this.crudLayout.getConfig(SCREEN_KEY);
  }
  setShowExport(v: boolean): void {
    this.crudLayout.setLayout({ showExportButtons: v }, SCREEN_KEY);
    this.layoutConfig = this.crudLayout.getConfig(SCREEN_KEY);
    this.initDataTable();
  }

  resetLayoutConfig(): void {
    this.crudLayout.resetConfig(SCREEN_KEY);
    this.layoutConfig = this.crudLayout.getConfig(SCREEN_KEY);
    this.initDataTable();
    this.closeLayoutConfig();
  }
}



