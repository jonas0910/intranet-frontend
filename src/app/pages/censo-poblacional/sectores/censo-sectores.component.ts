import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CensoPoblacionalService } from '../services/censo-poblacional.service';
import { ToastService } from '../../../services/toast.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

declare var bootstrap: any;

@Component({
    selector: 'app-censo-sectores',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, SystemLayoutComponent, DataTablesModule, RouterModule, ConfirmDialogComponent],
    templateUrl: './censo-sectores.component.html'
})
export class CensoSectoresComponent implements OnInit {
    @ViewChild('sectorModal') sectorModalRef!: ElementRef;

    cv!: CrudViewConfig;
    sectores: any[] = [];
    loading = false;
    saving = false;
    deleting = false;

    dtOptions: any = {};
    dtTrigger: Subject<any> = new Subject<any>();
    @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;
    mostrarTabla = true;

    form!: FormGroup;
    isEditing = false;
    sectorAEliminar: any = null;

    modalInstance: any;

    constructor(
        private censoService: CensoPoblacionalService,
        private fb: FormBuilder,
        private toast: ToastService,
        private dsService: DesignSystemService,
        private modalService: NgbModal
    ) {
        this.createForm();
    }

    ngOnInit() {
        this.cv = this.dsService.getCrudViewFor('censo-poblacional');
        this.dtOptions = {
            paging: true, searching: true, info: true, responsive: true,
            language: { url: 'assets/datatables/i18n/es-ES.json' },
            order: [[0, 'asc']]
        };
        this.loadData();
    }

    private safeDtTriggerNext(): void {
        if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
    }

    createForm() {
        this.form = this.fb.group({
            id_sector: [null],
            nombre_sector: ['', [Validators.required, Validators.maxLength(150)]],
            codigo_postal: ['', [Validators.maxLength(20)]],
            activo: [true]
        });
    }

    loadData() {
        if (this.sectores.length === 0) {
            this.loading = true;
        }
        this.censoService.getAllSectores().subscribe({
            next: (res) => {
                this.sectores = res.data;
                this.triggerDataTable();
                this.loading = false;
            },
            error: () => {
                this.toast.error('Error al cargar sectores');
                this.loading = false;
            }
        });
    }

    private triggerDataTable() {
        this.mostrarTabla = false;
        if (this.dtElement && this.dtElement.dtInstance) {
            this.dtElement.dtInstance.then((dtInstance: any) => {
                dtInstance.destroy();
                this.reconstruirTabla();
            }).catch(() => {
                this.reconstruirTabla();
            });
        } else {
            this.reconstruirTabla();
        }
    }

    private reconstruirTabla() {
        setTimeout(() => {
            this.mostrarTabla = true;
            setTimeout(() => {
                this.safeDtTriggerNext();
            }, 150);
        }, 10);
    }

    openModal(sector?: any) {
        this.isEditing = !!sector;
        if (sector) {
            this.form.patchValue(sector);
        } else {
            this.form.reset({ activo: true });
        }

        if (this.sectorModalRef) {
            this.modalInstance = new bootstrap.Modal(this.sectorModalRef.nativeElement);
            this.modalInstance.show();
        }
    }

    closeModal() {
        if (this.modalInstance) this.modalInstance.hide();
        this.form.reset();
    }

    save() {
        if (this.form.invalid) {
            this.toast.warning('Complete los campos obligatorios');
            return;
        }
        this.saving = true;
        this.censoService.saveSector(this.form.value).subscribe({
            next: (res) => {
                if (res.success) {
                    this.toast.success(res.message || 'Sector guardado correctamente');
                    this.closeModal();
                    this.loadData();
                } else {
                    this.toast.error(res.message);
                }
                this.saving = false;
            },
            error: (e) => {
                // Validation error display logic could go here
                this.toast.error('Hubo un error de validación o conflicto de nombres');
                this.saving = false;
            }
        });
    }

    confirmDelete(sector: any) {
        this.sectorAEliminar = sector;
        const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
        ref.componentInstance.subsystem = 'censo-poblacional';
        ref.componentInstance.title = 'Eliminar sector';
        ref.componentInstance.message = `¿Está seguro de eliminar el sector «${sector.nombre_sector}»?`;
        ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
        ref.componentInstance.type = 'danger';
        ref.componentInstance.confirmText = 'Sí, eliminar';
        ref.componentInstance.confirmIcon = 'fas fa-trash';
        ref.componentInstance.confirmClass = 'btn-danger';

        ref.result.then(
            () => this.executeDelete(),
            () => { this.sectorAEliminar = null; }
        );
    }

    executeDelete() {
        if (!this.sectorAEliminar) return;
        this.deleting = true;
        this.censoService.deleteSector(this.sectorAEliminar.id_sector).subscribe({
            next: (res) => {
                if (res.success) {
                    this.toast.success(res.message || 'Sector eliminado');
                    this.sectorAEliminar = null;
                    this.loadData();
                } else {
                    this.toast.error(res.message);
                }
                this.deleting = false;
            },
            error: (err) => {
                const msg = err?.error?.message || 'Error al eliminar el sector';
                this.toast.warning(msg);
                this.deleting = false;
                this.sectorAEliminar = null;
            }
        });
    }

    get f() { return this.form.controls; }
}
