import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { Subject } from 'rxjs';
import { LegalParameterService, LegalParameter } from '../../../services/legal-parameter.service';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent } from '../../../shared/components';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuditService } from '../../../services/audit.service';

@Component({
  selector: 'app-parametros-legales',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    DataTablesModule,
    PageHeaderComponent,
    CrudActionsComponent,
    StatusBadgeComponent
  ],
  templateUrl: './parametros-legales.component.html',
  styleUrls: ['./parametros-legales.component.scss']
})
export class ParametrosLegalesComponent implements OnInit, OnDestroy {
  parametros: LegalParameter[] = [];
  form!: FormGroup;
  selected: LegalParameter | null = null;
  isEdit = false;
  saving = false;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;
  @ViewChild('editModal') editModalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;
  private editModal: any;
  private viewModal: any;

  constructor(
    private service: LegalParameterService,
    private fb: FormBuilder,
    private dsService: DesignSystemService,
    private modalService: NgbModal,
    private auditService: AuditService
  ) { this.initForm(); }

  ngOnInit(): void {
    this.cv = this.dsService.getCrudViewFor('planillas');
    this.mc = this.dsService.getModalCrudFor('planillas');
    this.initDataTable();
    this.load();
  }

  ngOnDestroy(): void { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.complete(); }

  initForm(): void {
    this.form = this.fb.group({
      // map to backend field names when saving
      parameter_code: ['', Validators.required],
      parameter_name: ['', Validators.required],
      description: [''],
      value: [0, [Validators.required]],
      unit: [''],
      update_frequency: ['monthly'],
      effective_from: [''],
      effective_to: [''],
      notes: [''],
      is_active: [true]
    });
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

  load(): void {
    this.service.getAll().subscribe({
      next: (resp) => {
        const data: any = resp.data;
        this.parametros = Array.isArray(data) ? data : (data?.data || []);
        if (this.dtElement?.dtInstance) {
          this.dtElement.dtInstance.then((dtInstance: any) => {
            dtInstance.destroy();
            if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
          });
        } else {
          setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
        }
      },
      error: () => {
        this.parametros = [];
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      }
    });
  }

  reloadTable(): void {
    this.service.getAll().subscribe({
      next: (resp) => {
        const data: any = resp.data;
        this.parametros = Array.isArray(data) ? data : (data?.data || []);
        if (this.dtElement?.dtInstance) {
          this.dtElement.dtInstance.then((dtInstance: any) => {
            dtInstance.destroy();
            if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
          });
        } else {
          if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
        }
      }
    });
  }

  openCreate(): void {
    this.isEdit = false;
    this.selected = null;
    this.form.reset({ parameter_code: '', parameter_name: '', description: '', value: 0, unit: '', update_frequency: 'monthly', effective_from: '', effective_to: '', notes: '', is_active: true });
    // @ts-ignore
    this.editModal = new (window as any).bootstrap.Modal(this.editModalRef.nativeElement);
    this.editModal.show();
  }

  openEdit(item: LegalParameter): void {
    this.isEdit = true;
    this.selected = item;
    this.form.patchValue({
      parameter_code: item.parameter_code || item.code,
      parameter_name: item.parameter_name || item.name,
      description: item.description,
      value: item.value,
      unit: item.unit,
      update_frequency: item.update_frequency || item.frequency,
      effective_from: this.toDateOnly(item.effective_from) ?? '',
      effective_to: this.toDateOnly(item.effective_to ?? item.effective_until) ?? '',
      notes: item.notes,
      is_active: item.is_active
    });
    // @ts-ignore
    this.editModal = new (window as any).bootstrap.Modal(this.editModalRef.nativeElement);
    this.editModal.show();
  }

  openView(item: LegalParameter): void {
    this.selected = item;
    // @ts-ignore
    this.viewModal = new (window as any).bootstrap.Modal(this.viewModalRef.nativeElement);
    this.viewModal.show();
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;
    const payload: Partial<LegalParameter> = {
      parameter_code: v.parameter_code,
      parameter_name: v.parameter_name,
      description: v.description,
      value: v.value,
      unit: v.unit,
      update_frequency: v.update_frequency,
      effective_from: v.effective_from,
      effective_to: v.effective_to,
      notes: v.notes,
      is_active: v.is_active
    };
    const op = this.isEdit && this.selected?.id
      ? this.service.update(this.selected.id!, payload)
      : this.service.create(payload);

    op.subscribe({
      next: (resp) => {
        if (resp.success) {
          this.reloadTable();
          this.saving = false;
          this.closeEdit();
          // Registrar auditoría para guardar parámetro legal
          const action = this.isEdit ? 'Actualización de Parámetro Legal' : 'Creación de Parámetro Legal';
          const description = this.isEdit 
            ? `Parámetro legal ${payload.parameter_name} actualizado exitosamente`
            : `Parámetro legal ${payload.parameter_name} creado exitosamente`;
          this.auditService.logAction(
            action,
            'Gestión de Parámetros Legales',
            description,
            'success'
          );
        }
      },
      error: () => { this.saving = false; }
    });
  }

  delete(item: LegalParameter): void {
    if (!item.id) return;
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Parámetro Legal';
    ref.componentInstance.message = `¿Está seguro de eliminar "${item.name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';
    ref.result.then(
      () => this.service.delete(item.id!).subscribe({ 
        next: () => {
          this.reloadTable();
          // Registrar auditoría para eliminación de parámetro legal
          this.auditService.logAction(
            'Eliminación de Parámetro Legal',
            'Gestión de Parámetros Legales',
            `Parámetro legal ${item.name} eliminado exitosamente`,
            'success'
          );
        }
      }),
      () => {}
    );
  }

  closeEdit(): void { if (this.editModal) this.editModal.hide(); }
  closeView(): void { if (this.viewModal) this.viewModal.hide(); }

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
