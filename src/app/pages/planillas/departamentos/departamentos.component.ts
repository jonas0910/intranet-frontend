import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { Subject } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DepartmentService, Department } from '../../../services/department.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-departamentos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTablesModule, PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent],
  templateUrl: './departamentos.component.html',
  styleUrls: ['./departamentos.component.scss']
})
export class DepartamentosComponent extends CrudListExportBase implements OnInit, OnDestroy {

  departamentos: Department[] = [];
  departamentoForm!: FormGroup;
  selectedDepartamento: Department | null = null;
  isEditMode = false;
  saving = false;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;
  @ViewChild('departamentoModal') departamentoModalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;
  private modal: any;
  private viewModal: any;

  constructor(
    private departmentService: DepartmentService,
    private fb: FormBuilder,
    private modalService: NgbModal,
    crudExport: CrudExportService
  ) {
    super(crudExport);
    this.initForm();
  }

  getExportData(): Record<string, unknown>[] {
    return this.departamentos as unknown as Record<string, unknown>[];
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'description', label: 'Descripción', format: (v) => (v as string) || 'Sin descripción' },
      { key: 'status', label: 'Estado', format: (v) => (v === 'active' ? 'Activo' : 'Inactivo') }
    ];
  }

  getExportTitle(): string {
    return 'Listado de Departamentos';
  }

  getExportFilename(): string {
    return 'departamentos';
  }

  ngOnInit(): void {
    this.initDataTable();
    this.loadDepartamentos();
  }

  ngOnDestroy(): void {
    // No llamar dtTrigger.complete(): si el componente se reutiliza (p. ej. RouteReuseStrategy),
    // la directiva DataTable intenta subscribe() en ngOnInit y lanza ObjectUnsubscribedError.
  }

  initForm(): void {
    this.departamentoForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      // status string: 'active' | 'inactive' to match template
      status: ['active', Validators.required]
    });
  }

  initDataTable(): void {
    const pageLength = this.cv?.defaultPageSize ?? 10;
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength,
      lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, 'Todos']],
      processing: true,
      responsive: true,
      stateSave: true,
      stateDuration: 0,
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[1, 'asc']],
      columnDefs: [
        { targets: 0, width: '80px' },
        { targets: -1, orderable: false, searchable: false }
      ]
    };
  }

  private triggerDataTable(): void {
    const safeNext = () => {
      try {
        if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
      } catch (_) { /* Subject already closed (e.g. component destroyed) */ }
    };
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: any) => {
        dtInstance.destroy();
        safeNext();
      });
    } else {
      setTimeout(safeNext, 0);
    }
  }

  loadDepartamentos(): void {
    this.departmentService.getAll().subscribe({
      next: (response) => {
        if (response.success) {
          const data: any = response.data;
          const items = Array.isArray(data) ? data : (data?.data || []);
          this.departamentos = items.map((d: any) => ({
            ...d,
            status: d.status ?? (d.is_active ? 'active' : 'inactive')
          }));
          this.departamentos.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          this.triggerDataTable();
        }
      }
    });
  }

  reloadTable(): void {
    this.departmentService.getAll().subscribe({
      next: (response) => {
        if (response.success) {
          const data: any = response.data;
          const items = Array.isArray(data) ? data : (data?.data || []);
          this.departamentos = items.map((d: any) => ({
            ...d,
            status: d.status ?? (d.is_active ? 'active' : 'inactive')
          }));
          this.departamentos.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          this.triggerDataTable();
        }
      }
    });
  }

  saveDepartamento(): void {
    if (this.departamentoForm.invalid) return;
    this.saving = true;
    const formValue = this.departamentoForm.value;
    const payload: any = {
      code: formValue.code,
      name: formValue.name,
      description: formValue.description,
      is_active: formValue.status === 'active'
    };
    const op = this.isEditMode && this.selectedDepartamento
      ? this.departmentService.update(this.selectedDepartamento.id!, payload)
      : this.departmentService.create(payload);

    op.subscribe({
      next: (resp) => {
        if (resp.success) {
          this.reloadTable();
          this.saving = false;
          this.closeModal();
        }
      },
      error: () => { this.saving = false; }
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedDepartamento = null;
    this.departamentoForm.reset({ code: '', name: '', description: '', status: 'active' });
    // @ts-ignore
    this.modal = new (window as any).bootstrap.Modal(this.departamentoModalRef.nativeElement);
    this.modal.show();
  }

  openEditModal(departamento: any): void {
    this.isEditMode = true;
    this.selectedDepartamento = departamento;
    this.departamentoForm.patchValue({
      code: departamento.code,
      name: departamento.name,
      description: departamento.description || '',
      status: departamento.status ?? (departamento.is_active ? 'active' : 'inactive')
    });
    // @ts-ignore
    this.modal = new (window as any).bootstrap.Modal(this.departamentoModalRef.nativeElement);
    this.modal.show();
  }

  openViewModal(departamento: any): void {
    this.selectedDepartamento = departamento;
    // @ts-ignore
    this.viewModal = new (window as any).bootstrap.Modal(this.viewModalRef.nativeElement);
    this.viewModal.show();
  }

  closeModal(): void {
    if (this.modal) this.modal.hide();
  }

  closeViewModal(): void {
    if (this.viewModal) this.viewModal.hide();
  }

  confirmDelete(departamento: any): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Registro';
    ref.componentInstance.message = `¿Está seguro de eliminar "${departamento.name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.departmentService.delete(departamento.id!).subscribe({
          next: (resp) => { if (resp.success) this.reloadTable(); },
          error: (e) => console.error('Error eliminando:', e)
        });
      },
      () => { }
    );
  }
}

