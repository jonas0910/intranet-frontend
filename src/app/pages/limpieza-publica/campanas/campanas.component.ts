import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { ToastService } from '../../../services/toast.service';
import { LimpiezaPublicaService } from '../services/limpieza-publica.service';
import { CensoPoblacionalService } from '../../censo-poblacional/services/censo-poblacional.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

declare var $: any;

@Component({
    selector: 'app-lp-campanas',
    standalone: true,
    imports: [CommonModule, FormsModule, SystemLayoutComponent],
    templateUrl: './campanas.component.html',
    styleUrls: ['./campanas.component.scss']
})
export class LpCampanasComponent extends CrudListExportBase implements OnInit, OnDestroy {
    Math = Math;

    // Listado
    campanas: any[] = [];
    loading = false;
    filtrosColapsados = false;
    filtros: any = { buscar: '', activo: '', fecha_desde: '', fecha_hasta: '', per_page: 15 };
    paginacion: any = { total: 0, currentPage: 1, lastPage: 1, perPage: 15 };

    // Formulario crear/editar
    modoEdicion = false;
    guardando = false;
    formulario: any = this.formVacio();
    campanaSeleccionada: any = null;
    tabActiva: 'general' | 'participantes' = 'general';

    // Eliminación
    campanaAEliminar: any = null;
    eliminando = false;

    // Participantes
    participantes: any[] = [];
    cargandoParticipantes = false;
    busquedaCiudadano = '';
    resultadosBusqueda: any[] = [];
    buscandoCiudadano = false;
    ciudadanoSeleccionado: any = null;
    private busqueda$ = new Subject<string>();

    private destroy$ = new Subject<void>();
    private lpService = inject(LimpiezaPublicaService);
    private censoService = inject(CensoPoblacionalService);
    private toast = inject(ToastService);

    // Gestión de Ciudadanos (Nueva sección)
    tabPrincipal: 'campanas' | 'ciudadanos' = 'campanas';
    ciudadanos: any[] = [];
    ciudadanosFiltrados: any[] = [];
    loadingCiudadanos = false;
    filtrosCiudadanos: any = { buscar: '', sector_id: '', per_page: 25 };
    paginacionCiudadanos: any = { total: 0, currentPage: 1, lastPage: 1, perPage: 25 };
    ciudadanosSeleccionados = new Set<number>();
    sectores: any[] = [];
    generandoPdf = false;




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
        this.cargar();
        this.cargarSectores();
        // Autocomplete con debounce
        this.busqueda$.pipe(
            debounceTime(350),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(q => this.ejecutarBusquedaCiudadano(q));
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    formVacio(): any {
        return { nombre: '', fecha_inicio: '', fecha_fin: '', descripcion: '', activo: true };
    }

    // ── Listado ────────────────────────────────────────────────────────────

    cargar(pagina = 1): void {
        this.loading = true;
        const params = { ...this.filtros, page: pagina };
        this.lpService.getCampanas(params).subscribe({
            next: (res: any) => {
                this.campanas = res.data;
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

    onFilterChange(): void { this.paginacion.currentPage = 1; this.paginacion.perPage = +this.filtros.per_page || 10; this.cargar(1); }

    limpiarFiltros(): void {
        this.filtros = { buscar: '', activo: '', fecha_desde: '', fecha_hasta: '', per_page: 15 };
        this.cargar(1);
    }

    cambiarPagina(p: number): void {
        if (p < 1 || p > this.paginacion.lastPage) return;
        this.cargar(p);
    }

    getPaginas(): number[] {
        const pages: number[] = [];
        const c = this.paginacion.currentPage, l = this.paginacion.lastPage;
        if (l <= 7) { for (let i = 1; i <= l; i++) pages.push(i); }
        else if (c <= 3) { for (let i = 1; i <= 4; i++) pages.push(i); pages.push(-1); pages.push(l); }
        else if (c >= l - 2) { pages.push(1); pages.push(-1); for (let i = l - 3; i <= l; i++) pages.push(i); }
        else { pages.push(1); pages.push(-1); for (let i = c - 1; i <= c + 1; i++) pages.push(i); pages.push(-1); pages.push(l); }
        return pages;
    }

    // ── CRUD Modal ─────────────────────────────────────────────────────────

    abrirCrear(): void {
        this.modoEdicion = false;
        this.campanaSeleccionada = null;
        this.formulario = this.formVacio();
        this.tabActiva = 'general';
        this.participantes = [];
        this.limpiarBusqueda();
        $('#modalCampana').modal('show');
    }

    abrirEditar(c: any): void {
        this.modoEdicion = true;
        this.campanaSeleccionada = c;
        this.formulario = {
            nombre: c.nombre,
            fecha_inicio: c.fecha_inicio?.substring(0, 10) ?? '',
            fecha_fin: c.fecha_fin?.substring(0, 10) ?? '',
            descripcion: c.descripcion ?? '',
            activo: !!c.activo
        };
        this.tabActiva = 'general';
        this.limpiarBusqueda();
        this.cargarParticipantes(c.id_campana);
        $('#modalCampana').modal('show');
    }

    abrirParticipantes(c: any): void {
        this.abrirEditar(c);
        this.tabActiva = 'participantes';
    }

    cerrarModal(): void {
        $('#modalCampana').modal('hide');
    }

    guardar(): void {
        if (!this.formulario.nombre || !this.formulario.fecha_inicio || !this.formulario.fecha_fin) return;
        this.guardando = true;

        const obs = {
            next: (res: any) => {
                const msg = this.modoEdicion ? 'Campaña actualizada correctamente' : 'Campaña creada correctamente';
                this.toast.success(msg, this.modoEdicion ? 'Actualización exitosa' : 'Registro exitoso');
                this.cerrarModal();
                this.cargar(this.paginacion.currentPage);
                this.guardando = false;
            },
            error: (err: any) => {
                this.toast.error('Error: ' + (err.error?.message || 'Error desconocido'), 'Error');
                this.guardando = false;
            }
        };

        if (this.modoEdicion) {
            this.lpService.updateCampana(this.campanaSeleccionada.id_campana, this.formulario).subscribe(obs);
        } else {
            this.lpService.createCampana(this.formulario).subscribe(obs);
        }
    }

    // ── Eliminación ────────────────────────────────────────────────────────

    confirmarEliminar(c: any): void {
        this.campanaAEliminar = c;
        $('#modalEliminarCampana').modal('show');
    }

    eliminarCampana(): void {
        if (!this.campanaAEliminar) return;
        this.eliminando = true;
        this.lpService.eliminarCampana(this.campanaAEliminar.id_campana).subscribe({
            next: () => {
                this.toast.success(`Campaña "${this.campanaAEliminar.nombre}" eliminada correctamente`, 'Eliminado');
                $('#modalEliminarCampana').modal('hide');
                this.campanaAEliminar = null;
                this.eliminando = false;
                this.cargar(this.paginacion.currentPage);
            },
            error: (err: any) => {
                this.toast.error('Error al eliminar: ' + (err.error?.message || 'Error desconocido'), 'Error');
                this.eliminando = false;
            }
        });
    }

    // ── Participantes ──────────────────────────────────────────────────────

    setTab(tab: 'general' | 'participantes'): void {
        this.tabActiva = tab;
        if (tab === 'participantes' && this.campanaSeleccionada) {
            this.cargarParticipantes(this.campanaSeleccionada.id_campana);
        }
    }

    cargarParticipantes(idCampana: number): void {
        this.cargandoParticipantes = true;
        this.lpService.getParticipantesCampana(idCampana).subscribe({
            next: (res: any) => {
                this.participantes = res.data || [];
                this.cargandoParticipantes = false;
            },
            error: () => this.cargandoParticipantes = false
        });
    }

    onBuscarCiudadano(q: string): void {
        this.busqueda$.next(q);
    }

    private ejecutarBusquedaCiudadano(q: string): void {
        if (!q || q.trim().length < 2) { this.resultadosBusqueda = []; return; }
        this.buscandoCiudadano = true;
        this.lpService.buscarCiudadanos(q.trim()).subscribe({
            next: (res: any) => {
                this.resultadosBusqueda = res.data || [];
                this.buscandoCiudadano = false;
            },
            error: () => this.buscandoCiudadano = false
        });
    }

    seleccionarCiudadano(c: any): void {
        this.ciudadanoSeleccionado = c;
        this.busquedaCiudadano = c.nombres + ' — ' + c.dni;
        this.resultadosBusqueda = [];
    }

    // Registro manual
    mostrarFormManual = false;
    formManual: any = { nombre: '', dni: '', telefono: '' };

    agregarParticipante(): void {
        if (!this.campanaSeleccionada) return;

        let datos: any = {};
        if (this.ciudadanoSeleccionado) {
            datos.id_ciudadano = this.ciudadanoSeleccionado.id_ciudadano;
        } else if (this.mostrarFormManual) {
            if (!this.formManual.nombre || !this.formManual.dni) {
                this.toast.warning('Debe ingresar nombre y DNI para el registro manual', 'Datos incompletos');
                return;
            }
            datos.nombre_participante = this.formManual.nombre;
            datos.dni_participante = this.formManual.dni;
            datos.telefono = this.formManual.telefono;
        } else {
            return;
        }

        this.lpService.agregarParticipante(this.campanaSeleccionada.id_campana, datos).subscribe({
            next: () => {
                this.toast.success('Participante registrado correctamente', 'Registro exitoso');
                this.limpiarBusqueda();
                this.cargarParticipantes(this.campanaSeleccionada.id_campana);
                // Actualizar contador en la lista
                const c = this.campanas.find(x => x.id_campana === this.campanaSeleccionada.id_campana);
                if (c) c.participantes_count = (c.participantes_count || 0) + 1;
            },
            error: (err: any) => {
                this.toast.error(err.error?.message || 'Error al agregar participante', 'Error');
            }
        });
    }

    quitarParticipante(p: any): void {
        this.lpService.quitarParticipante(this.campanaSeleccionada.id_campana, p.id).subscribe({
            next: () => {
                this.toast.success('Participante retirado de la campaña', 'Eliminado');
                this.participantes = this.participantes.filter(x => x.id !== p.id);
                const c = this.campanas.find(x => x.id_campana === this.campanaSeleccionada.id_campana);
                if (c && c.participantes_count > 0) c.participantes_count--;
            },
            error: () => this.toast.error('Error al retirar participante', 'Error')
        });
    }

    limpiarBusqueda(): void {
        this.busquedaCiudadano = '';
        this.ciudadanoSeleccionado = null;
        this.resultadosBusqueda = [];
    }

    toggleModoManual(): void {
        this.mostrarFormManual = !this.mostrarFormManual;
        this.limpiarBusqueda();
        this.formManual = { nombre: '', dni: '', telefono: '' };
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    diasRestantes(fechaFin: string): number {
        const fin = new Date(fechaFin);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        fin.setHours(0, 0, 0, 0);
        return Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    }

    estadoCampana(c: any): { label: string; cls: string } {
        if (!c.activo) return { label: 'INACTIVA', cls: 'badge-secondary' };
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const ini = new Date(c.fecha_inicio);
        const fin = new Date(c.fecha_fin);
        if (hoy < ini) return { label: 'PRÓXIMA', cls: 'badge-info' };
        if (hoy > fin) return { label: 'FINALIZADA', cls: 'badge-warning' };
        return { label: 'EN CURSO', cls: 'badge-success' };
    }

    formatFecha(f: string): string {
        if (!f) return '—';
        return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // ── Gestión de Ciudadanos (Nuevos Métodos) ──────────────────────────────

    setTabPrincipal(tab: 'campanas' | 'ciudadanos'): void {
        this.tabPrincipal = tab;
        if (tab === 'ciudadanos' && this.ciudadanos.length === 0) {
            this.cargarCiudadanos();
        }
    }

    cargarSectores(): void {
        this.censoService.getSectores().subscribe({
            next: (res: any) => this.sectores = res.data || [],
            error: () => { }
        });
    }

    cargarCiudadanos(): void {
        this.loadingCiudadanos = true;
        this.censoService.getCiudadanos().subscribe({
            next: (res: any) => {
                this.ciudadanos = res.data || [];
                this.aplicarFiltrosCiudadanos();
                this.loadingCiudadanos = false;
            },
            error: () => this.loadingCiudadanos = false
        });
    }

    aplicarFiltrosCiudadanos(pagina = 1): void {
        let result = [...this.ciudadanos];

        if (this.filtrosCiudadanos.buscar) {
            const q = this.filtrosCiudadanos.buscar.toLowerCase();
            result = result.filter(c =>
                c.nombres.toLowerCase().includes(q) || (c.dni && c.dni.includes(q))
            );
        }

        if (this.filtrosCiudadanos.sector_id) {
            result = result.filter(c => c.id_sector == this.filtrosCiudadanos.sector_id);
        }

        this.paginacionCiudadanos.total = result.length;
        this.paginacionCiudadanos.currentPage = pagina;
        this.paginacionCiudadanos.lastPage = Math.ceil(result.length / this.filtrosCiudadanos.per_page) || 1;

        const start = (pagina - 1) * this.filtrosCiudadanos.per_page;
        this.ciudadanosFiltrados = result.slice(start, start + this.filtrosCiudadanos.per_page);
    }

    onFilterCiudadanosChange(): void {
        this.aplicarFiltrosCiudadanos(1);
    }

    cambiarPaginaCiudadanos(p: number): void {
        if (p < 1 || p > this.paginacionCiudadanos.lastPage) return;
        this.aplicarFiltrosCiudadanos(p);
    }

    getPaginasCiudadanos(): number[] {
        const pages = [];
        for (let i = 1; i <= this.paginacionCiudadanos.lastPage; i++) {
            pages.push(i);
        }
        return pages;
    }

    limpiarFiltrosCiudadanos(): void {
        this.filtrosCiudadanos = { buscar: '', sector_id: '', per_page: 25 };
        this.aplicarFiltrosCiudadanos(1);
    }

    toggleSeleccionCiudadano(id: number): void {
        if (this.ciudadanosSeleccionados.has(id)) {
            this.ciudadanosSeleccionados.delete(id);
        } else {
            this.ciudadanosSeleccionados.add(id);
        }
    }

    seleccionarTodosCiudadanos(event: any): void {
        const checked = event.target.checked;
        if (checked) {
            this.ciudadanos.forEach(c => this.ciudadanosSeleccionados.add(c.id_ciudadano));
        } else {
            this.ciudadanosSeleccionados.clear();
        }
    }

    confirmarGenerarPdf(tipo: 'cartilla' | 'credencial', ciudadano?: any): void {
        const titulo = tipo === 'cartilla' ? 'Cartilla de Control' : 'Credencial de Reciclador';
        const msg = ciudadano
            ? `¿Desea generar la ${titulo} para ${ciudadano.nombres}?`
            : `¿Desea generar la ${titulo} para los ${this.ciudadanosSeleccionados.size} ciudadanos seleccionados?`;

        if (confirm(msg)) {
            if (ciudadano) {
                this.generarPdf(tipo, [ciudadano]);
            } else {
                const seleccionados = this.ciudadanos.filter(c => this.ciudadanosSeleccionados.has(c.id_ciudadano));
                this.generarPdf(tipo, seleccionados);
            }
        }
    }

    async generarPdf(tipo: 'cartilla' | 'credencial', lista: any[]): Promise<void> {
        if (lista.length === 0) return;
        this.generandoPdf = true;
        this.toast.info('Generando documento...', 'Procesando');

        try {
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            for (const c of lista) {
                const page = pdfDoc.addPage(tipo === 'cartilla' ? [595.28, 841.89] : [243.78, 153.07]); // A4 o ID Card
                const { width, height } = page.getSize();

                if (tipo === 'cartilla') {
                    // --- DISEÑO CARTILLA DE CONTROL ---
                    page.drawRectangle({ x: 40, y: height - 100, width: width - 80, height: 60, color: rgb(0.95, 0.95, 0.95), borderColor: rgb(0, 0, 0), borderWidth: 1 });
                    page.drawText('CARTILLA DE CONTROL DE SANEAMIENTO AMBIENTAL', { x: 60, y: height - 65, size: 16, font: fontBold });
                    page.drawText('Notaria DISTRITAL DE POCOLLAY - ÁREA DE LIMPIEZA PÚBLICA', { x: 60, y: height - 85, size: 10, font: font });

                    page.drawText(`CIUDADANO: ${c.nombres.toUpperCase()}`, { x: 50, y: height - 130, size: 12, font: fontBold });
                    page.drawText(`DNI: ${c.dni}`, { x: 50, y: height - 150, size: 11, font: font });
                    page.drawText(`DIRECCIÓN: ${c.direccion || 'Tacna, Pocollay'}`, { x: 50, y: height - 170, size: 11, font: font });

                    // Rejilla de control (Meses)
                    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    let yPos = height - 210;
                    page.drawText('REGISTRO DE RECOLECCIÓN Y CUMPLIMIENTO 2026', { x: width / 2 - 120, y: yPos, size: 12, font: fontBold });
                    yPos -= 30;

                    for (let i = 0; i < meses.length; i++) {
                        const x = i % 2 === 0 ? 50 : width / 2 + 10;
                        const y = yPos - Math.floor(i / 2) * 60;
                        page.drawRectangle({ x, y, width: width / 2 - 60, height: 50, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 1 });
                        page.drawText(meses[i], { x: x + 5, y: y + 35, size: 10, font: fontBold });
                        page.drawText('Firma/Sello: ____________________', { x: x + 5, y: y + 10, size: 8, font: font });
                    }
                } else {
                    // --- DISEÑO CREDENCIAL RECICLADOR ---
                    page.drawRectangle({ x: 5, y: 5, width: width - 10, height: height - 10, borderColor: rgb(0.18, 0.49, 0.2), borderWidth: 2 });
                    page.drawText('RECICLADOR AUTORIZADO', { x: width / 2 - 65, y: height - 25, size: 11, font: fontBold, color: rgb(0.18, 0.49, 0.2) });

                    // Placeholder Foto
                    page.drawRectangle({ x: 15, y: 40, width: 60, height: 75, color: rgb(0.9, 0.9, 0.9), borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });
                    page.drawText('FOTO', { x: 35, y: 75, size: 8, font: font, color: rgb(0.5, 0.5, 0.5) });

                    page.drawText(c.nombres.split(' ')[0], { x: 85, y: 95, size: 12, font: fontBold });
                    page.drawText(c.nombres.split(' ').slice(1).join(' '), { x: 85, y: 80, size: 10, font: font });
                    page.drawText(`DNI: ${c.dni}`, { x: 85, y: 65, size: 10, font: fontBold });
                    page.drawText('PROGRAMA SEGREGA', { x: 85, y: 45, size: 8, font: font, color: rgb(0.3, 0.3, 0.3) });

                    page.drawText('VÁLIDO HASTA: 31/12/2026', { x: 85, y: 20, size: 7, font: font });
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            this.generandoPdf = false;
        } catch (error) {
            console.error(error);
            this.toast.error('Error al generar el PDF', 'Error');
            this.generandoPdf = false;
        }
    }
}
