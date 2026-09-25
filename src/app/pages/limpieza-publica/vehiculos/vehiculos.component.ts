import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LimpiezaPublicaService } from '../services/limpieza-publica.service';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { ToastService } from '../../../services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

declare var $: any;

@Component({
    selector: 'app-lp-vehiculos',
    standalone: true,
    imports: [CommonModule, FormsModule, SystemLayoutComponent, DataTablesModule],
    templateUrl: './vehiculos.component.html',
    styles: [`
        .ds-crud-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #6c757d; }
        .ds-crud-filter { border-radius: 4px; }
        .badge-success-light { background-color: #e6f7ef; color: #28a745; border: 1px solid rgba(40,167,69,0.2); }
        .badge-warning-light { background-color: #fff9e6; color: #ffc107; border: 1px solid rgba(255,193,7,0.2); }
        .badge-danger-light { background-color: #feeeee; color: #dc3545; border: 1px solid rgba(220,53,69,0.2); }
    `]
})
export class LpVehiculosComponent extends CrudListExportBase implements OnInit, OnDestroy {
    activeTab: 'lista-vehiculos' | 'tipos-mantenimiento' = 'lista-vehiculos';
    vehiculos: any[] = [];
    filtros: any = { placa: '', tipo: undefined, estado: undefined };
    loading = false;
    isFiltersCollapsed = false;
    guardando = false;

    // Formulario Vehículo
    formVehiculo: any = {};
    editando = false;
    vehiculoSeleccionado: any = null;

    // Tipos de Mantenimiento
    tiposMantenimiento: any[] = [];
    formTipoMantenimiento: any = {};
    editandoTipo = false;
    guardandoTipo = false;

    // DataTables
    dtOptions: any = {};
    dtTrigger: Subject<any> = new Subject<any>();
    @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

    private destroy$ = new Subject<void>();
    private lpService = inject(LimpiezaPublicaService);
    private toast = inject(ToastService);
    private modalService = inject(NgbModal);

    constructor(crudExport: CrudExportService) {
        super(crudExport);
    }

    override get cv(): CrudViewConfig {
        return this.dsService.getCrudViewFor('limpieza-publica');
    }

    override getExportData(): Record<string, unknown>[] {
        return this.vehiculos.map(v => ({
            placa: v.placa,
            tipo: v.tipo,
            marca: v.marca,
            modelo: v.modelo,
            anio: v.anio,
            capacidad: v.capacidad_kg,
            estado: v.estado
        }));
    }

    override getExportColumns(): CrudExportColumn[] {
        return [
            { key: 'placa', label: 'Placa' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'marca', label: 'Marca' },
            { key: 'modelo', label: 'Modelo' },
            { key: 'anio', label: 'Año' },
            { key: 'capacidad', label: 'Capacidad (kg)' },
            { key: 'estado', label: 'Estado' }
        ];
    }

    override getExportTitle(): string { return 'Listado de Vehículos - Limpieza Pública'; }
    override getExportFilename(): string { return 'vehiculos-limpieza'; }

    ngOnInit(): void {
        this.initDataTable();
        this.cargarVehiculos();
        this.cargarTiposMantenimiento();
        this.resetForm();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (!this.dtTrigger.closed) this.dtTrigger.complete();
    }

    initDataTable(): void {
        this.dtOptions = {
            paging: true,
            searching: true,
            info: true,
            responsive: true,
            language: { url: 'assets/datatables/i18n/es-ES.json' },
            order: [[1, 'asc']],
            columnDefs: [
                { targets: 0, width: '40px' },
                { targets: -1, orderable: false, searchable: false, width: '120px' }
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
            this.dtTrigger.next(null);
        }
    }

    cargarVehiculos(): void {
        this.loading = true;
        this.lpService.getVehiculos(this.filtros)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.vehiculos = res.data || [];
                    this.loading = false;
                    this.triggerDataTable();
                },
                error: (err: any) => {
                    console.error('Error cargando vehículos:', err);
                    this.toast.error('No se pudo cargar la flota vehicular', 'Error de conexión');
                    this.loading = false;
                }
            });
    }

    limpiarFiltros(): void {
        this.filtros = { placa: '', tipo: undefined, estado: undefined };
        this.cargarVehiculos();
    }

    // --- Gestión de Pestañas ---
    setActiveTab(tab: 'lista-vehiculos' | 'tipos-mantenimiento'): void {
        this.activeTab = tab;
    }

    // --- Gestión de Vehículos ---
    resetForm() {
        this.formVehiculo = {
            placa: '',
            tipo: 'compactador',
            capacidad_kg: null,
            origen: 'interna',
            estado: 'operativo',
            marca: '',
            modelo: '',
            anio: new Date().getFullYear(),
            odometro_actual: 0,
            department_id: 10,
            fecha_soat: null,
            fecha_revision_tecnica: null,
            fecha_ultimo_mantenimiento: null,
            fecha_proximo_mantenimiento: null,
            observaciones: '',
            numero_motor: '',
            numero_chasis: ''
        };
        this.editando = false;
    }

    abrirNuevo() {
        this.resetForm();
        $('#modalVehiculo').modal('show');
    }

    abrirEditar(v: any) {
        this.editando = true;
        this.formVehiculo = { ...v };
        // Formatear fechas para input type="date"
        if (v.fecha_soat) this.formVehiculo.fecha_soat = v.fecha_soat.split('T')[0];
        if (v.fecha_revision_tecnica) this.formVehiculo.fecha_revision_tecnica = v.fecha_revision_tecnica.split('T')[0];
        if (v.fecha_ultimo_mantenimiento) this.formVehiculo.fecha_ultimo_mantenimiento = v.fecha_ultimo_mantenimiento.split('T')[0];
        if (v.fecha_proximo_mantenimiento) this.formVehiculo.fecha_proximo_mantenimiento = v.fecha_proximo_mantenimiento.split('T')[0];
        
        $('#modalVehiculo').modal('show');
    }

    openView(v: any) {
        this.vehiculoSeleccionado = v;
        $('#modalViewVehiculo').modal('show');
    }

    closeView() {
        $('#modalViewVehiculo').modal('hide');
    }

    cerrarModal() {
        $('#modalVehiculo').modal('hide');
        this.resetForm();
    }

    guardar() {
        if (this.guardando) return;
        this.guardando = true;

        const payload = {
            ...this.formVehiculo,
            department_id: 10,
            categoria_id: 3
        };

        const request$ = this.editando
            ? this.lpService.updateVehiculo(this.formVehiculo.id, payload)
            : this.lpService.createVehiculo(payload);

        request$
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.toast.success(
                        this.editando ? 'Unidad actualizada correctamente' : 'Nueva unidad registrada con éxito',
                        'Operación Exitosa'
                    );
                    this.cargarVehiculos();
                    this.cerrarModal();
                    this.guardando = false;
                },
                error: (err: any) => {
                    console.error('Error al guardar vehículo:', err);
                    this.toast.error(
                        err.error?.message || 'Ocurrió un error al procesar el registro',
                        'Error al Guardar'
                    );
                    this.guardando = false;
                }
            });
    }

    eliminar(v: any) {
        const modalRef = this.modalService.open(ConfirmDialogComponent, { centered: true });
        modalRef.componentInstance.title = 'Eliminar Vehículo';
        modalRef.componentInstance.message = `¿Está seguro que desea eliminar el vehículo con placa ${v.placa}?`;
        modalRef.componentInstance.subsystem = 'limpieza-publica';
        modalRef.componentInstance.type = 'danger';
        modalRef.componentInstance.confirmText = 'Sí, eliminar';
        modalRef.componentInstance.confirmIcon = 'fas fa-trash';
        modalRef.componentInstance.confirmClass = 'btn-danger';

        modalRef.result.then((result) => {
            if (result) {
                this.lpService.eliminarVehiculo(v.id)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.toast.success('Vehículo eliminado definitivamente', 'Registro Eliminado');
                            this.cargarVehiculos();
                        },
                        error: (err: any) => {
                            console.error('Error al eliminar vehículo:', err);
                            this.toast.error('No se pudo eliminar el vehículo seleccionado', 'Error');
                        }
                    });
            }
        }, () => { });
    }

    // --- Gestión de Tipos de Mantenimiento ---
    cargarTiposMantenimiento() {
        this.lpService.getTiposMantenimiento({ categoria: 'limpieza-publica' })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.tiposMantenimiento = res.data?.data || res.data || [];
                },
                error: (err) => console.error('Error cargando tipos:', err)
            });
    }

    abrirModalNuevoTipo() {
        this.editandoTipo = false;
        this.formTipoMantenimiento = {
            nombre: '',
            tipo_medicion: 'kilometraje',
            frecuencia_kilometros: null,
            frecuencia_dias: null,
            descripcion: '',
            activo: true,
            categoria: 'limpieza-publica'
        };
        $('#modalTipoMantenimiento').modal('show');
    }

    editarTipoMantenimiento(t: any) {
        this.editandoTipo = true;
        this.formTipoMantenimiento = { ...t };
        $('#modalTipoMantenimiento').modal('show');
    }

    cerrarModalTipo() {
        $('#modalTipoMantenimiento').modal('hide');
    }

    guardarTipo() {
        if (this.guardandoTipo) return;
        this.guardandoTipo = true;

        const request$ = this.editandoTipo
            ? this.lpService.updateTipoMantenimiento(this.formTipoMantenimiento.id, this.formTipoMantenimiento)
            : this.lpService.createTipoMantenimiento(this.formTipoMantenimiento);

        request$.subscribe({
            next: () => {
                this.toast.success('Configuración guardada');
                this.cargarTiposMantenimiento();
                this.cerrarModalTipo();
                this.guardandoTipo = false;
            },
            error: (err) => {
                this.toast.error('Error al guardar configuración');
                this.guardandoTipo = false;
            }
        });
    }

    getVehicleStatusClass(estado: string): string {
        switch (estado) {
            case 'operativo': return 'badge-success';
            case 'mantenimiento': return 'badge-warning';
            case 'fuera_servicio': return 'badge-danger';
            default: return 'badge-secondary';
        }
    }
}
