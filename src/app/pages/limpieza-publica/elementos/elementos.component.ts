import { Component, OnInit, OnDestroy, inject, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LimpiezaPublicaService } from '../services/limpieza-publica.service';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { ToastService } from '../../../services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

declare var $: any;
declare var L: any; // Leaflet

@Component({
    selector: 'app-lp-elementos',
    standalone: true,
    imports: [CommonModule, FormsModule, SystemLayoutComponent, DataTablesModule],
    templateUrl: './elementos.component.html',
    styles: [`
        .extra-small { font-size: 0.65rem; line-height: 1; }
        .extra-small i { font-size: 10px; }
        .extra-small i.fa-map-marker-alt { vertical-align: middle; }
        .ds-crud-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #6c757d; display: block; margin-bottom: 2px; }
        .ds-crud-filter { border-radius: 4px; border: 1px solid #ced4da; }
        .badge-info-light { background-color: #e7f3ff; color: #007bff; border: 1px solid rgba(0,123,255,0.2); }
        .badge-success-light { background-color: #e6f7ef; color: #28a745; border: 1px solid rgba(40,167,69,0.2); }
        .badge-warning-light { background-color: #fff9e6; color: #ffc107; border: 1px solid rgba(255,193,7,0.2); }
        .badge-danger-light { background-color: #feeeee; color: #dc3545; border: 1px solid rgba(220,53,69,0.2); }
        .badge-secondary-light { background-color: #f8f9fa; color: #6c757d; border: 1px solid rgba(108,117,125,0.2); }
        .bg-primary { background-color: #007bff !important; }
        .text-primary { color: #007bff !important; }
        .btn-primary { background: #007bff; color: #fff; }
        .btn-primary:hover { background: #0056b3; color: #fff; }
    `]
})
export class LpElementosComponent extends CrudListExportBase implements OnInit, OnDestroy, AfterViewInit {
    // Listas y Catálogos
    elementos: any[] = [];
    tiposElemento: any[] = [];
    catalogos: any;
    loading = false;
    filtrosColapsados = true;

    // Filtros
    filtros: any = { id_tipo_elemento: null, id_sector: null, estado_operativo: null, q: '' };

    // Formularios
    formElemento: any = {};
    formTipo: any = {};
    editando = false;
    guardando = false;

    // DataTables
    dtOptions: any = {};
    dtTrigger: Subject<any> = new Subject<any>();
    @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

    // Mapa
    private map: any;
    private marker: any;
    private mapGlobal: any;
    private markersGlobal: any[] = [];
    private defaultCenter: any = [-18.0065, -70.2462]; // Tacna default center

    // Servicios
    private lpService = inject(LimpiezaPublicaService);
    
    private toast = inject(ToastService);
    private modalService = inject(NgbModal);
    private destroy$ = new Subject<void>();

    
    

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
        this.initDataTable();
        this.cargarCatalogos();
        this.cargarElementos();
        this.cargarTipos();
        this.resetFormElemento();
        this.resetFormTipo();
    }

    ngAfterViewInit(): void {
        // Inicializar map individualmente si es necesario
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.map) this.map.remove();
        if (this.mapGlobal) this.mapGlobal.remove();
    }

    // ── Lógica de Carga ──────────────────────────────────────────────────

    cargarCatalogos(): void {
        this.lpService.getCatalogos().pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
            this.catalogos = res.data;
            this.tiposElemento = res.data.tipos_elemento || [];
        });
    }

    cargarElementos(): void {
        this.loading = true;
        this.lpService.getElementosUrbanos(this.filtros).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                this.elementos = res.data || [];
                this.loading = false;
                this.triggerDataTable();
            },
            error: (err) => {
                console.error('Error cargando elementos:', err);
                this.toast.error('Error al recuperar inventario', 'Infraestructura');
                this.loading = false;
            }
        });
    }

    cargarTipos(): void {
        this.lpService.getTiposElemento().pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                this.tiposElemento = res.data.tipos_elemento || [];
            }
        });
    }

    // ── Lógica CRUD Elemento Urbano ──────────────────────────────────────

    resetFormElemento(): void {
        this.formElemento = {
            id_tipo_elemento: null,
            codigo: '',
            nombre: '',
            descripcion: '',
            id_sector: null,
            latitud: null,
            longitud: null,
            direccion_referencia: '',
            estado_operativo: 'operativo'
        };
        this.editando = false;
    }

    abrirNuevoElemento(): void {
        this.resetFormElemento();
        $('#modalElemento').modal('show');
        this.initMap();
    }

    abrirEditarElemento(el: any): void {
        this.editando = true;
        this.formElemento = { ...el };
        $('#modalElemento').modal('show');
        this.initMap();
        if (el.latitud && el.longitud) {
            this.updateMarker(el.latitud, el.longitud);
        }
    }

    guardarElemento(): void {
        if (this.guardando) return;
        this.guardando = true;

        const request$ = this.editando
            ? this.lpService.updateElementoUrbano(this.formElemento.id_elemento, this.formElemento)
            : this.lpService.createElementoUrbano(this.formElemento);

        request$.pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                this.toast.success(this.editando ? 'Elemento actualizado correctamente' : 'Nuevo elemento registrado', 'Éxito');
                this.cargarElementos();
                $('#modalElemento').modal('hide');
                this.guardando = false;
            },
            error: (err) => {
                console.error('Error al guardar elemento:', err);
                this.toast.error(err.error?.message || 'No se pudo completar la operación', 'Error al Guardar');
                this.guardando = false;
            }
        });
    }

    eliminarElemento(el: any): void {
        const modalRef = this.modalService.open(ConfirmDialogComponent, { centered: true });
        modalRef.componentInstance.title = 'Eliminar Infraestructura';
        modalRef.componentInstance.message = `¿Seguro que desea eliminar el elemento ${el.codigo} (${el.nombre})?`;
        modalRef.componentInstance.subsystem = 'limpieza-publica';
        modalRef.componentInstance.type = 'danger';

        modalRef.result.then((res) => {
            if (res) {
                this.lpService.eliminarElementoUrbano(el.id_elemento).pipe(takeUntil(this.destroy$)).subscribe(() => {
                    this.toast.success('Elemento eliminado del inventario', 'Registro Borrado');
                    this.cargarElementos();
                });
            }
        }, () => { });
    }

    // ── Lógica CRUD Tipo de Elemento ─────────────────────────────────────

    resetFormTipo(): void {
        this.formTipo = {
            nombre: '',
            categoria: '',
            descripcion: '',
            requiere_mantenimiento: false,
            activo: true
        };
        this.editando = false;
    }

    abrirNuevoTipo(): void {
        this.resetFormTipo();
        $('#modalTipoElemento').modal('show');
    }

    abrirEditarTipo(t: any): void {
        this.editando = true;
        this.formTipo = { ...t };
        $('#modalTipoElemento').modal('show');
    }

    guardarTipo(): void {
        const request$ = this.editando
            ? this.lpService.updateTipoElemento(this.formTipo.id_tipo_elemento, this.formTipo)
            : this.lpService.createTipoElemento(this.formTipo);

        request$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.toast.success('Tipo configurado correctamente', 'Catálogos Actualizados');
                this.cargarTipos();
                this.cargarCatalogos();
                $('#modalTipoElemento').modal('hide');
            },
            error: () => this.toast.error('No se pudo guardar la configuración', 'Error')
        });
    }

    eliminarTipo(t: any): void {
        const modalRef = this.modalService.open(ConfirmDialogComponent, { centered: true });
        modalRef.componentInstance.title = 'Configuración de Catálogo';
        modalRef.componentInstance.message = `¿Desea eliminar el tipo de elemento '${t.nombre}'?`;

        modalRef.result.then((res) => {
            if (res) {
                this.lpService.eliminarTipoElemento(t.id_tipo_elemento).pipe(takeUntil(this.destroy$)).subscribe(() => {
                    this.toast.success('Tipo eliminado', 'Catálogo');
                    this.cargarTipos();
                });
            }
        }, () => { });
    }

    // ── Mapas e Interacción ──────────────────────────────────────────────

    initMap(): void {
        setTimeout(() => {
            if (!this.map) {
                this.map = L.map('mapSelector').setView(this.defaultCenter, 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(this.map);

                this.map.on('click', (e: any) => {
                    this.updateMarker(e.latlng.lat, e.latlng.lng);
                    this.formElemento.latitud = e.latlng.lat.toFixed(7);
                    this.formElemento.longitud = e.latlng.lng.toFixed(7);
                });
            } else {
                this.map.invalidateSize();
            }
        }, 300);
    }

    updateMarker(lat: number, lng: number): void {
        if (this.marker) {
            this.marker.setLatLng([lat, lng]);
        } else {
            this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
            this.marker.on('dragend', (e: any) => {
                const pos = e.target.getLatLng();
                this.formElemento.latitud = pos.lat.toFixed(7);
                this.formElemento.longitud = pos.lng.toFixed(7);
            });
        }
        this.map.setView([lat, lng], 16);
    }

    getIconForTipo(nombre: string): string {
        const n = nombre.toLowerCase();
        if (n.includes('contenedor') || n.includes('tacho') || n.includes('basura') || n.includes('reciclaje')) return 'fas fa-recycle';
        if (n.includes('camion') || n.includes('compactador') || n.includes('vehiculo')) return 'fas fa-truck-moving';
        if (n.includes('escoba') || n.includes('barrido') || n.includes('limpieza')) return 'fas fa-broom';
        if (n.includes('aviso') || n.includes('señal') || n.includes('alerta')) return 'fas fa-exclamation-triangle';
        if (n.includes('personal') || n.includes('operario') || n.includes('trabajador')) return 'fas fa-hard-hat';
        if (n.includes('punto') || n.includes('acopio')) return 'fas fa-map-pin';
        return 'fas fa-cube';
    }

    abrirMapaGlobal(): void {
        $('#modalMapaGlobal').modal('show');
        this.initMapGlobal();
    }

    initMapGlobal(): void {
        setTimeout(() => {
            if (!this.mapGlobal) {
                this.mapGlobal = L.map('mapaGlobal').setView(this.defaultCenter, 14);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(this.mapGlobal);
            } else {
                this.mapGlobal.invalidateSize();
            }

            // Limpiar marcadores anteriores
            this.markersGlobal.forEach(m => m.remove());
            this.markersGlobal = [];

            // Añadir marcadores por cada elemento
            const bounds: any[] = [];
            this.elementos.forEach(el => {
                if (el.latitud && el.longitud) {
                    const iconClass = this.getIconForTipo(el.tipo_elemento?.nombre || '');
                    const marker = L.marker([el.latitud, el.longitud], {
                        icon: L.divIcon({
                            className: 'custom-marker',
                            html: `<div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 32px; height: 32px; border: 2px solid white;">
                                     <i class="${iconClass}" style="font-size: 14px;"></i>
                                   </div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 32]
                        })
                    }).addTo(this.mapGlobal);

                    const popupContent = `
                        <div class="p-1" style="min-width: 180px;">
                            <h6 class="font-weight-bold text-primary mb-1">${el.nombre}</h6>
                            <div class="small mb-1"><span class="badge badge-light border">${el.tipo_elemento?.nombre}</span></div>
                            <div class="text-muted small mb-2"><i class="fas fa-barcode mr-1"></i>${el.codigo}</div>
                            <div class="small mb-2"><i class="fas fa-map-marker-alt text-danger mr-1"></i>${el.direccion_referencia || 'Sin dirección'}</div>
                            <div class="d-flex justify-content-between align-items-center border-top pt-2">
                                <span class="badge ${this.getStatusClass(el.estado_operativo)}">${el.estado_operativo.toUpperCase()}</span>
                                <button class="btn btn-xs btn-outline-primary" onclick="window.lpElementsRef.abrirEditarElementoDesdeMapa(${el.id_elemento})">Editar</button>
                            </div>
                        </div>
                    `;
                    marker.bindPopup(popupContent);
                    this.markersGlobal.push(marker);
                    bounds.push([el.latitud, el.longitud]);
                }
            });

            if (bounds.length > 0) {
                this.mapGlobal.fitBounds(bounds, { padding: [50, 50] });
            }

            // Exponer referencia global para el onclick del popup
            (window as any).lpElementsRef = {
                abrirEditarElementoDesdeMapa: (id: any) => {
                    const el = this.elementos.find(e => e.id_elemento == id);
                    if (el) {
                        $('#modalMapaGlobal').modal('hide');
                        setTimeout(() => this.abrirEditarElemento(el), 300);
                    }
                }
            };
        }, 300);
    }

    verEnMapa(el: any): void {
        this.abrirMapaGlobal();
        // Podríamos centrar en este elemento específico si quisiéramos
    }

    // ── Utilidades ────────────────────────────────────────────────────────

    getStatusClass(estado: string): string {
        switch (estado) {
            case 'operativo': return 'badge-success-light';
            case 'mantenimiento': return 'badge-warning-light';
            case 'dañado': return 'badge-danger-light';
            default: return 'badge-secondary-light';
        }
    }

    initDataTable(): void {
        this.dtOptions = {
            paging: true,
            searching: true,
            info: true,
            responsive: true,
            language: { url: 'assets/datatables/i18n/es-ES.json' },
            order: [[0, 'asc']],
            columnDefs: [
                { targets: 0, width: '100px' },
                { targets: -1, orderable: false, searchable: false, width: '150px' }
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
}
