import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LimpiezaPublicaService } from '../services/limpieza-publica.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { ToastService } from '../../../services/toast.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

declare var $: any;

@Component({
    selector: 'app-lp-registro-trabajo',
    standalone: true,
    imports: [CommonModule, FormsModule, SystemLayoutComponent],
    templateUrl: './registro-trabajo.component.html',
    styleUrls: ['./registro-trabajo.component.scss']
})
export class LpRegistroTrabajoComponent extends CrudListExportBase implements OnInit, OnDestroy {
    Math = Math;

    // Estado UI
    loading = false;
    guardando = false;
    editando = false;
    isFiltersCollapsed = false;

    // Datos
    registros: any[] = [];
    catalogos: any;

    filtros: any = {
        search: '',
        id_personal: '',
        id_ruta: '',
        fecha_desde: '',
        fecha_hasta: '',
        per_page: 15,
        page: 1
    };

    paginacion: any = {
        total: 0,
        currentPage: 1,
        lastPage: 1,
        perPage: 15
    };

    form: any = {
        id_personal: '',
        id_ruta: '',
        fecha: new Date().toISOString().split('T')[0],
        hora_inicio: '',
        hora_fin: '',
        metros_limpiados: null,
        kg_recolectados: null,
        observaciones: ''
    };

    private destroy$ = new Subject<void>();
    private lpService = inject(LimpiezaPublicaService);
    
    private toast = inject(ToastService);

    

    constructor(crudExport: CrudExportService) {
        super(crudExport);
    }

    
    getExportData(): Record<string, unknown>[] {
        return [];
    }
    
    getExportColumns(): CrudExportColumn[] {
        return [];
    }
    
    getExportTitle(): string {
        return 'Exportar';
    }
    
    getExportFilename(): string {
        return 'export';
    }

    ngOnInit(): void {
        this.cargarCatalogos();
        this.cargarDatos();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    cargarCatalogos(): void {
        this.lpService.getCatalogos().pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => this.catalogos = res.data
        });
    }

    cargarDatos(pagina: number = 1): void {
        this.loading = true;
        this.filtros.page = pagina;
        this.lpService.getRegistrosTrabajo(this.filtros).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                this.registros = res.data;
                this.paginacion = {
                    total: res.meta.total,
                    currentPage: res.meta.current_page,
                    lastPage: res.meta.last_page,
                    perPage: res.meta.per_page
                };
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    onFilterChange(): void {
        this.cargarDatos(1);
    }

    limpiarFiltros(): void {
        this.filtros = {
            search: '',
            id_personal: '',
            id_ruta: '',
            fecha_desde: '',
            fecha_hasta: '',
            per_page: 15,
            page: 1
        };
        this.cargarDatos(1);
    }

    getPaginationPages(): number[] {
        const pages = [];
        for (let i = 1; i <= this.paginacion.lastPage; i++) pages.push(i);
        return pages;
    }

    onPageChange(p: number): void {
        if (p < 1 || p > this.paginacion.lastPage) return;
        this.cargarDatos(p);
    }

    abrirNuevo() {
        this.editando = false;
        this.form = {
            id_personal: '',
            id_ruta: '',
            fecha: new Date().toISOString().split('T')[0],
            hora_inicio: '',
            hora_fin: '',
            metros_limpiados: null,
            kg_recolectados: null,
            observaciones: ''
        };
        $('#modalRegistroTrabajo').modal('show');
    }

    abrirEditar(r: any) {
        this.editando = true;
        // Formatear fecha para el input date
        const fecha = r.fecha ? new Date(r.fecha).toISOString().split('T')[0] : '';
        this.form = {
            ...r,
            fecha,
            // Asegurar que los campos opcionales no sean null en el input si queremos que estén vacíos
            metros_limpiados: r.metros_limpiados || null,
            kg_recolectados: r.kg_recolectados || null
        };
        $('#modalRegistroTrabajo').modal('show');
    }

    cerrarModal() {
        $('#modalRegistroTrabajo').modal('hide');
    }

    guardar(): void {
        if (this.guardando) return;
        this.guardando = true;

        const query = this.editando
            ? this.lpService.updateRegistroTrabajo(this.form.id_registro, this.form)
            : this.lpService.createRegistroTrabajo(this.form);

        query.subscribe({
            next: (res: any) => {
                this.toast.success(res.message || 'Operación exitosa');
                this.guardando = false;
                this.cerrarModal();
                this.cargarDatos(this.editando ? this.paginacion.currentPage : 1);
            },
            error: (err) => {
                this.toast.error(err.error?.message || 'Error al procesar la solicitud');
                this.guardando = false;
            }
        });
    }

    confirmarEliminar(r: any) {
        if (confirm(`¿Está seguro de eliminar el registro de ${r.personal?.name} del día ${r.fecha}?`)) {
            this.lpService.eliminarRegistroTrabajo(r.id_registro).subscribe({
                next: (res: any) => {
                    this.toast.success(res.message || 'Registro eliminado');
                    this.cargarDatos(this.paginacion.currentPage);
                },
                error: (err) => this.toast.error(err.error?.message || 'Error al eliminar')
            });
        }
    }

    formatDate(date: any): string {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    formatTime(time: string): string {
        if (!time) return '-';
        return time.substring(0, 5); // HH:mm
    }
}
