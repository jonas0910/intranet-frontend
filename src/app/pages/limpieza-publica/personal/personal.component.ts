import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../services/toast.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServiceModalComponent } from './service-modal/service-modal.component';
import { EmployeeContractService, EmployeeContract } from '../../../services/employee-contract.service';

declare var $: any;

@Component({
  selector: 'app-lp-personal',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    DataTablesModule, 
    SystemLayoutComponent,
    StatusBadgeComponent,
    ServiceModalComponent
  ],
  templateUrl: './personal.component.html',
  styleUrls: ['./personal.component.scss']
})
export class LpPersonalComponent extends CrudListExportBase implements OnInit, OnDestroy {
  personal: any[] = [];
  loading = false;
  saving = false;
  isEdit = false;

  isViewMode = false;
  personalSeleccionado: any = null;

  // Contracts & Tabs
  activeTab = 'info';
  contracts: EmployeeContract[] = [];
  loadingContracts = false;
  showContractModal = false;
  contractModalData?: EmployeeContract;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  filtros: any = {
    search: '',
    status: '',
    per_page: 10,
    page: 1
  };

  paginacion = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 10
  };

  protected Math = Math;

  formulario: any = {
    dni: '',
    nombres: '',
    apellidos: '',
    email: '',
    telefono: '',
    direccion: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    status: 'activo',
    cargo: ''
  };

  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private modalService: NgbModal,
    crudExport: CrudExportService,
    private ds: DesignSystemService,
    private contractService: EmployeeContractService
  ) {
    super(crudExport);
  }

  override get cv(): CrudViewConfig {
    return this.ds.getCrudViewFor('limpieza-publica');
  }

  ngOnInit(): void {
    this.filtros.per_page = this.cv.defaultPageSize || 10;
    this.paginacion.perPage = this.cv.defaultPageSize || 10;
    this.initDataTable();
    this.loadPersonal();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (!this.dtTrigger.closed) this.dtTrigger.complete();
  }

  initDataTable(): void {
    this.dtOptions = {
      paging: false,
      searching: false,
      info: false,
      processing: true,
      responsive: true,
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[1, 'asc']],
      columnDefs: [
        { targets: 0, orderable: false },
        { targets: -1, orderable: false }
      ]
    };
  }

  private triggerDataTable(): void {
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: any) => {
        dtInstance.destroy();
        this.dtTrigger.next(null);
      });
    } else {
      setTimeout(() => this.dtTrigger.next(null), 0);
    }
  }

  loadPersonal(): void {
    this.loading = true;
    const url = `${environment.apiUrl}/v1/limpieza-publica/personal`;
    this.http.get<any>(url, { params: this.filtros }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.personal = response.data.data || [];
          this.paginacion = {
            currentPage: response.data.current_page,
            lastPage: response.data.last_page,
            total: response.data.total,
            perPage: response.data.per_page
          };
          this.triggerDataTable();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading personal:', error);
        this.loading = false;
      }
    });
  }

  onFilterChange(): void {
    this.paginacion.currentPage = 1;
    this.filtros.page = 1;
    this.loadPersonal();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.paginacion.lastPage) {
      this.paginacion.currentPage = page;
      this.filtros.page = page;
      this.loadPersonal();
    }
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      status: '',
      per_page: this.cv.defaultPageSize || 10,
      page: 1
    };
    this.loadPersonal();
  }

  openCreate(): void {
    this.isViewMode = false;
    this.personalSeleccionado = null;
    this.resetFormulario();

    this.activeTab = 'info';
    setTimeout(() => { $('#info-tab').tab('show'); }, 50);

    $('#modalLpPersonal').modal('show');
  }

  openEdit(persona: any): void {
    if (persona.is_planilla) {
        this.toast.warning('No se puede editar personal de planilla desde este módulo.');
        return;
    }
    this.isEdit = true;
    this.isViewMode = false;
    this.personalSeleccionado = persona;
    this.formulario = { ...persona };
    if (this.formulario.fecha_ingreso) {
      this.formulario.fecha_ingreso = this.formulario.fecha_ingreso.split('T')[0];
    }

    this.activeTab = 'info';
    setTimeout(() => { $('#info-tab').tab('show'); }, 50);

    $('#modalLpPersonal').modal('show');
  }

  openView(persona: any): void {
    this.isViewMode = true;
    this.isEdit = false;
    this.personalSeleccionado = persona;
    this.formulario = { ...persona };
    if (this.formulario.fecha_ingreso) {
      this.formulario.fecha_ingreso = this.formulario.fecha_ingreso.split('T')[0];
    }

    this.activeTab = 'info';
    setTimeout(() => { $('#info-tab').tab('show'); }, 50);

    $('#modalLpPersonal').modal('show');
  }

  closeModal(): void {
    $('#modalLpPersonal').modal('hide');
    this.isViewMode = false;
  }

  save(): void {
    this.saving = true;
    const url = `${environment.apiUrl}/v1/limpieza-publica/personal`;
    
    const request = this.isEdit 
      ? this.http.put(`${url}/${this.personalSeleccionado.id}`, this.formulario)
      : this.http.post(url, this.formulario);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toast.success(this.isEdit ? 'Personal actualizado' : 'Personal registrado');
          this.closeModal();
          this.loadPersonal();
        }
        this.saving = false;
      },
      error: (error) => {
        this.toast.error('Error al guardar: ' + (error.error?.message || error.message));
        this.saving = false;
      }
    });
  }

  delete(persona: any): void {
    if (persona.is_planilla) {
        this.toast.warning('No se puede eliminar personal de planilla desde este módulo.');
        return;
    }

    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Personal';
    ref.componentInstance.message = `¿Deseas eliminar a ${persona.nombres} ${persona.apellidos}?`;
    ref.componentInstance.type = 'danger';
    
    ref.result.then((result) => {
      if (result) {
        this.http.delete<any>(`${environment.apiUrl}/v1/limpieza-publica/personal/${persona.id}`)
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.toast.success('Personal eliminado');
                this.loadPersonal();
              }
            }
          });
      }
    }, () => {});
  }

  resetFormulario(): void {
    this.formulario = {
       dni: '',
       nombres: '',
       apellidos: '',
       email: '',
       telefono: '',
       direccion: '',
       fecha_ingreso: new Date().toISOString().split('T')[0],
       status: 'activo',
       cargo: ''
    };
  }

  getFullName(p: any): string {
    return `${p.nombres || ''} ${p.apellidos || ''}`.trim();
  }

  // Export base methods
  getExportData(): Record<string, unknown>[] {
    return this.personal.map(p => ({
      codigo: p.codigo,
      dni: p.dni,
      nombre: `${p.nombres} ${p.apellidos}`,
      estado: p.estado,
      ingreso: p.fecha_ingreso
    }));
  }
  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'codigo', label: 'Código' },
      { key: 'dni', label: 'DNI' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'estado', label: 'Estado' },
      { key: 'ingreso', label: 'F. Ingreso' }
    ];
  }
  getExportTitle(): string { return 'Personal Limpieza Pública'; }
  getExportFilename(): string { return 'personal-lp'; }

  getPaginationPages(): number[] {
    const pages: number[] = [];
    const current = this.paginacion.currentPage;
    const last = this.paginacion.lastPage;

    if (last <= 7) {
      for (let i = 1; i <= last; i++) pages.push(i);
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1);
        pages.push(last);
      } else if (current >= last - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = last - 3; i <= last; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(last);
      }
    }
    return pages;
  }

  // --- CONTRACTS MANAGEMENT ---

  loadContracts() {
    if (!this.personalSeleccionado?.id) return;
    this.loadingContracts = true;
    this.contractService.getContractsByEmployee(this.personalSeleccionado.id).subscribe({
      next: (res: any) => {
        if (res.success) this.contracts = res.data;
        this.loadingContracts = false;
      },
      error: () => this.loadingContracts = false
    });
  }

  openContractModal() {
    this.contractModalData = undefined;
    this.showContractModal = true;
  }

  editContract(contract: EmployeeContract) {
    this.contractModalData = contract;
    this.showContractModal = true;
  }

  deleteContract(contract: EmployeeContract) {
    if (confirm('¿Está seguro de eliminar este contrato/orden?')) {
      this.contractService.deleteContract(contract.id!).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.toast.success('Contrato eliminado exitosamente');
            this.loadContracts();
          }
        }
      });
    }
  }

  onContractModalClosed(saved: boolean) {
    this.showContractModal = false;
    if (saved) this.loadContracts();
  }

  getContractStatusClass(status: string): string {
    switch (status) {
      case 'vigente': return 'badge-success';
      case 'vencido': return 'badge-danger';
      case 'renovado': return 'badge-info';
      case 'rescindido': return 'badge-warning';
      case 'suspendido': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  }
}
