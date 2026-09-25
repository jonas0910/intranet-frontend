import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { CensoPoblacionalService, Ciudadano, Evento, Sector, Organizacion } from '../services/censo-poblacional.service';
import { ToastService } from '../../../services/toast.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

interface CiudadanoAsignable extends Ciudadano {
  _selected?: boolean;
}

declare var $: any;

@Component({
  selector: 'app-censo-entregas',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent, RouterModule, DataTablesModule],
  templateUrl: './censo-entregas.component.html',
  styles: [`
    .rounded-circle { flex-shrink: 0; }
    .border-dashed { border-style: dashed !important; border-width: 2px !important; }
    .nav-tabs .nav-link { font-weight: 500; color: #495057; cursor: pointer; }
    .nav-tabs .nav-link.active { font-weight: bold; color: #007bff; border-bottom: 3px solid #007bff; }
    .checkbox-col { width: 40px; text-align: center; }
  `]
})
export class CensoEntregasComponent implements OnInit, OnDestroy, AfterViewInit {
  cv!: CrudViewConfig;

  eventos: Evento[] = [];
  selectedEventoId: number | null = null;
  activeTab = 'individual'; // individual, masiva, lista

  // --- Tab 1: Individual ---
  dniBusqueda = '';
  citizen: Ciudadano | null = null;
  loadingSearch = false;
  loadingConfirm = false;
  searched = false;
  successIndividual = false;
  successMessageContext = '';

  // --- Tab 2: Masiva ---
  sectores: Sector[] = [];
  organizaciones: any[] = [];
  padronCompleto: Ciudadano[] = [];
  ciudadanosParaAsignar: CiudadanoAsignable[] = [];
  filtroSectorMasivo = '';
  filtroOrganizacionMasivo = '';
  filtroEdadMasivo: number | null = null;
  filtroSexoMasivo = '';
  filtroTipoPoblacion = ''; // niños, mayores, padres, discapacitados
  loadingMasiva = false;
  selectAllMasiva = false;
  successMasiva = false;
  successMasivaCount = 0;

  // --- Tab 3: Lista Asignados ---
  ciudadanosAsignados: any[] = [];
  loadingLista = false;
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;
  mostrarTabla = false;
  Math = Math;
  // Filtros exportación y vista
  filtroResponsablePdf = '';
  filtroInicioRango = 1;
  filtroFinRango = 100;
  filtroOperadorLista = '';
  filtroSectorLista = '';
  asignadosFiltrados: any[] = [];
  uniqueOperadores: any[] = [];

  constructor(
    private censoService: CensoPoblacionalService,
    private toast: ToastService,
    private dsService: DesignSystemService
  ) { }

  ngOnInit() {
    this.cv = this.dsService.getCrudViewFor('censo-poblacional');

    this.dtOptions = {
      paging: true, searching: true, info: true, responsive: true,
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[3, 'desc']] // Order by update date
    };

    this.censoService.getEventos().subscribe(res => {
      this.eventos = res.data; // include 'Finalizado' optionally if they want to view lists, but for assigning only Activo
      const activos = this.eventos.filter(e => e.estado === 'Activo');
      if (activos.length > 0) {
        this.selectedEventoId = activos[0].id_evento;
        this.onEventoChange();
      } else if (this.eventos.length > 0) {
        this.selectedEventoId = this.eventos[0].id_evento;
        this.onEventoChange();
      }
      setTimeout(() => this.initSelect2Entregas(), 150);
    });

    this.censoService.getSectores().subscribe(res => {
      this.sectores = res.data;
      setTimeout(() => this.initSelect2Entregas(), 150);
    });
    this.censoService.getOrganizaciones().subscribe(res => {
      this.organizaciones = res.data;
      setTimeout(() => this.initSelect2Entregas(), 150);
    });
    this.censoService.getCiudadanos().subscribe(res => this.padronCompleto = res.data);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initSelect2Entregas(), 400);
  }

  ngOnDestroy() {
    if (typeof $ !== 'undefined') {
      try {
        const $e = $('#evento_select');
        if ($e.data('select2')) $e.select2('destroy');
      } catch (_) { }
      try {
        const $s = $('#sector_masivo_select');
        if ($s.data('select2')) $s.select2('destroy');
      } catch (_) { }
      try {
        const $o = $('#organizacion_masivo_select');
        if ($o.data('select2')) $o.select2('destroy');
      } catch (_) { }
    }
  }

  initSelect2Entregas(): void {
    if (typeof $ === 'undefined') return;
    const opts = this.dsService.getSelect2Options({
      allowClear: true,
      placeholder: 'Seleccione...'
    });
    const sizeClass = this.dsService.getSelect2InputSizeClass('censo-poblacional');

    const $evento = $('#evento_select');
    if ($evento.length && !$evento.hasClass('select2-hidden-accessible')) {
      try {
        if ($evento.data('select2')) $evento.select2('destroy');
      } catch (_) { }
      $evento.select2(opts).on('change', () => {
        const val = $evento.val();
        this.selectedEventoId = val ? +val : null;
        this.onEventoChange();
      });
      setTimeout(() => $evento.next('.select2-container').find('.select2-selection').addClass(sizeClass), 0);
      if (this.selectedEventoId != null) {
        $evento.val(String(this.selectedEventoId)).trigger('change.select2');
      }
    }

    const $sector = $('#sector_masivo_select');
    if ($sector.length && !$sector.hasClass('select2-hidden-accessible')) {
      try {
        if ($sector.data('select2')) $sector.select2('destroy');
      } catch (_) { }
      $sector.select2(opts).on('change', () => {
        this.filtroSectorMasivo = $sector.val() as string || '';
        this.aplicarFiltrosMasivos();
      });
      setTimeout(() => $sector.next('.select2-container').find('.select2-selection').addClass(sizeClass), 0);
      if (this.filtroSectorMasivo) {
        $sector.val(this.filtroSectorMasivo).trigger('change.select2');
      }
    }

    const $organizacion = $('#organizacion_masivo_select');
    if ($organizacion.length && !$organizacion.hasClass('select2-hidden-accessible')) {
      try {
        if ($organizacion.data('select2')) $organizacion.select2('destroy');
      } catch (_) { }
      $organizacion.select2(opts).on('change', () => {
        this.filtroOrganizacionMasivo = $organizacion.val() as string || '';
        this.aplicarFiltrosMasivos();
      });
      setTimeout(() => $organizacion.next('.select2-container').find('.select2-selection').addClass(sizeClass), 0);
      if (this.filtroOrganizacionMasivo) {
        $organizacion.val(this.filtroOrganizacionMasivo).trigger('change.select2');
      }
    }

    const $resp = $('#responsable_pdf_select');
    if ($resp.length && !$resp.hasClass('select2-hidden-accessible')) {
      try {
        if ($resp.data('select2')) $resp.select2('destroy');
      } catch (_) { }
      $resp.select2(opts).on('change', () => {
        this.filtroResponsablePdf = $resp.val() as string || '';
      });
      setTimeout(() => $resp.next('.select2-container').find('.select2-selection').addClass(sizeClass), 0);
    }

    const $sectorLista = $('#sector_lista_filter');
    if ($sectorLista.length && !$sectorLista.hasClass('select2-hidden-accessible')) {
      try {
        if ($sectorLista.data('select2')) $sectorLista.select2('destroy');
      } catch (_) { }
      $sectorLista.select2(opts).on('change', () => {
        this.filtroSectorLista = $sectorLista.val() as string || '';
        this.aplicarFiltrosLista();
      });
      setTimeout(() => $sectorLista.next('.select2-container').find('.select2-selection').addClass(sizeClass), 0);
    }
  }

  onEventoChange() {
    this.cancelarIndividual();
    this.filtroResponsablePdf = ''; // Reset when event changes
    if (this.activeTab === 'lista') {
      this.cargarListaAsignados();
    } else if (this.activeTab === 'masiva') {
      this.aplicarFiltrosMasivos();
    }
    setTimeout(() => this.initSelect2Entregas(), 200);
  }

  changeTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'lista' && this.selectedEventoId) {
      this.cargarListaAsignados();
    }
    if (tab === 'masiva' && this.selectedEventoId) {
      this.aplicarFiltrosMasivos();
    }
  }

  get isEventoActivo(): boolean {
    if (!this.selectedEventoId) return false;
    const ev = this.eventos.find(e => e.id_evento == this.selectedEventoId);
    return ev?.estado === 'Activo';
  }

  // ================= TAB 1: INDIVIDUAL =================

  buscar() {
    if (!this.dniBusqueda) return;
    this.loadingSearch = true;
    this.searched = false;
    this.citizen = null;

    this.censoService.buscarCiudadano(this.dniBusqueda).subscribe({
      next: (res) => {
        if (res.success) {
          this.citizen = res.data;
        } else {
          this.toast.warning('Ciudadano no encontrado en el padrón');
        }
        this.loadingSearch = false;
        this.searched = true;
      },
      error: () => {
        this.toast.error('Error al realizar la búsqueda');
        this.loadingSearch = false;
        this.searched = true;
      }
    });
  }

  confirmar() {
    if (!this.citizen || !this.selectedEventoId) return;
    this.loadingConfirm = true;
    this.censoService.registrarEntrega({
      id_ciudadano: this.citizen.id_ciudadano,
      id_evento: this.selectedEventoId
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Entrega registrada exitosamente');
          this.successMessageContext = this.citizen!.nombres;
          this.successIndividual = true;
        } else {
          this.toast.error(res.message || 'Error al registrar entrega');
        }
        this.loadingConfirm = false;
      },
      error: () => {
        this.toast.error('Ocurrió un error. Es posible que el ciudadano ya esté registrado en este evento.');
        this.loadingConfirm = false;
      }
    });
  }

  cancelarIndividual() {
    this.citizen = null;
    this.dniBusqueda = '';
    this.searched = false;
    this.successIndividual = false;
  }

  resetIndividual() {
    this.cancelarIndividual();
  }

  // ================= TAB 2: MASIVA =================

  aplicarFiltrosMasivos() {
    if (!this.selectedEventoId) return;

    // Start with all padron
    let filtrados = [...this.padronCompleto];

    if (this.filtroSectorMasivo) {
      filtrados = filtrados.filter(c => c.id_sector == +this.filtroSectorMasivo);
    }
    if (this.filtroOrganizacionMasivo) {
      filtrados = filtrados.filter(c =>
        c.organizaciones?.some(o => o.id_organizacion == +this.filtroOrganizacionMasivo)
      );
    }
    if (this.filtroSexoMasivo) {
      filtrados = filtrados.filter(c => c.sexo === this.filtroSexoMasivo);
    }
    if (this.filtroEdadMasivo) {
      filtrados = filtrados.filter(c => c.edad >= this.filtroEdadMasivo!);
    }

    if (this.filtroTipoPoblacion) {
      switch (this.filtroTipoPoblacion) {
        case 'niños':
          filtrados = filtrados.filter(c => c.edad < 18);
          break;
        case 'jovenes':
          filtrados = filtrados.filter(c => c.edad >= 18 && c.edad < 30);
          break;
        case 'adultos':
          filtrados = filtrados.filter(c => c.edad >= 30 && c.edad < 60);
          break;
        case 'mayores':
          filtrados = filtrados.filter(c => c.edad >= 60);
          break;
        case 'padres':
          filtrados = filtrados.filter(c => c.es_padre_madre === true);
          break;
        case 'discapacitados':
          filtrados = filtrados.filter(c => c.tiene_discapacidad === true);
          break;
      }
    }

    // Assign an internal selected state
    this.ciudadanosParaAsignar = filtrados.map(c => ({ ...c, _selected: false }));
    this.selectAllMasiva = false;
  }

  toggleSelectAll() {
    this.ciudadanosParaAsignar.forEach(c => c._selected = this.selectAllMasiva);
  }

  checkIfAllSelected() {
    this.selectAllMasiva = this.ciudadanosParaAsignar.every(c => c._selected);
  }

  asignarMasivamente() {
    const seleccionados = this.ciudadanosParaAsignar.filter(c => c._selected).map(c => c.id_ciudadano);
    if (seleccionados.length === 0) {
      this.toast.warning('Seleccione al menos un ciudadano');
      return;
    }
    if (!this.selectedEventoId) return;

    if (!confirm(`¿Está seguro de asignar el beneficio a ${seleccionados.length} ciudadanos simultáneamente?`)) return;

    this.loadingMasiva = true;
    this.censoService.asignacionMasiva({
      id_evento: this.selectedEventoId,
      ids_ciudadanos: seleccionados
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(`Se registraron ${res.data.registrados} entregas exitosamente`);
          this.successMasivaCount = res.data.registrados;
          this.successMasiva = true;
        } else {
          this.toast.error(res.message || 'Error en la asignación masiva');
        }
        this.loadingMasiva = false;
      },
      error: () => {
        this.toast.error('Error de comunicación con el servidor');
        this.loadingMasiva = false;
      }
    });
  }

  resetMasiva() {
    this.successMasiva = false;
    this.aplicarFiltrosMasivos();
  }

  // ================= TAB 3: LISTA ASIGNADOS =================

  cargarListaAsignados() {
    if (!this.selectedEventoId) return;
    if (this.ciudadanosAsignados.length === 0) {
      this.loadingLista = true;
    }
    this.censoService.getCiudadanosPorEvento(this.selectedEventoId).subscribe({
      next: (res) => {
        this.ciudadanosAsignados = res.data;
        this.extraerOperadoresUnicos();
        this.filtroInicioRango = 1;
        this.filtroFinRango = Math.min(100, this.ciudadanosAsignados.length || 100);
        this.aplicarFiltrosLista();
        this.loadingLista = false;
      },
      error: () => {
        this.loadingLista = false;
      }
    });
  }

  extraerOperadoresUnicos() {
    const ops = new Map();
    this.ciudadanosAsignados.forEach(ca => {
      if (ca.operador) ops.set(ca.operador.id, ca.operador);
    });
    this.uniqueOperadores = Array.from(ops.values());
  }

  aplicarFiltrosLista() {
    let filtered = [...this.ciudadanosAsignados];

    if (this.filtroOperadorLista) {
      filtered = filtered.filter(ca => ca.operador?.id == +this.filtroOperadorLista);
    }

    if (this.filtroSectorLista) {
      filtered = filtered.filter(ca => ca.ciudadano?.id_sector == +this.filtroSectorLista);
    }

    // Apply Range AFTER criteria filters (or before, depends on business logic, usually before for pagination-like behavior)
    // The user wants range filters to "affect the list", implying choosing a subset of the currently filtered view or absolute records.
    // Usually range in these padron context is absolute position in the list.
    const start = Math.max(0, this.filtroInicioRango - 1);
    const end = this.filtroFinRango;

    this.asignadosFiltrados = filtered.slice(start, end);
    this.triggerDataTable();
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

  private safeDtTriggerNext(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
  }

  revocarEntrega(idEntrega: number) {
    if (!confirm('¿Está seguro de revocar esta entrega/asignación?')) return;

    this.censoService.eliminarEntrega(idEntrega).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Asignación revocada');
          this.cargarListaAsignados();
        } else {
          this.toast.error(res.message);
        }
      },
      error: () => {
        this.toast.error('Error de conexión');
      }
    });
  }

  exportarPdf() {
    if (!this.selectedEventoId || this.ciudadanosAsignados.length === 0) {
      this.toast.warning('No hay datos para exportar');
      return;
    }

    const evento = this.eventos.find(e => e.id_evento == this.selectedEventoId);

    if (this.asignadosFiltrados.length === 0) {
      this.toast.warning('La vista actual está vacía. No hay datos para exportar.');
      return;
    }

    const responsable = this.filtroResponsablePdf ?
      evento?.responsables?.find(r => r.id == +this.filtroResponsablePdf) : null;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fechaStr = new Date().toLocaleDateString();

    let html = `
      <html>
      <head>
        <title>Padrón de Beneficiarios - ${evento?.nombre_evento}</title>
        <style>
          body { font-family: 'Helvetica', Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 18pt; text-transform: uppercase; }
          .header p { margin: 5px 0; font-size: 10pt; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 9pt; }
          th { background-color: #f2f2f2; border: 1px solid #ccc; padding: 8px; text-align: left; }
          td { border: 1px solid #ccc; padding: 8px; vertical-align: middle; }
          .text-center { text-align: center; }
          .signature-box { height: 40px; width: 150px; border-bottom: 1px solid #000; margin: 0 auto; }
          .footer { margin-top: 50px; font-size: 8pt; text-align: right; }
          @media print {
            .no-print { display: none; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Padrón de Entrega de Beneficios</h1>
          <p><strong>Evento:</strong> ${evento?.nombre_evento} | <strong>Fecha Evento:</strong> ${new Date(evento?.fecha!).toLocaleDateString()} | <strong>Generado:</strong> ${fechaStr}</p>
          ${responsable ? `<p style="font-size: 11pt; color: #000; margin-top: 10px;"><strong>ENCARGADO DE ENTREGA:</strong> ${responsable.first_name} ${responsable.last_name} (DNI ${responsable.dni})</p>` : ''}
          <p style="font-size: 9pt; color: #444;">Mostrando registros del ${this.filtroInicioRango} al ${Math.min(this.filtroFinRango, this.ciudadanosAsignados.length)} (Total grupo: ${this.asignadosFiltrados.length})</p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">N°</th>
              <th style="width: 80px;">DNI</th>
              <th>Nombres y Apellidos</th>
              <th style="width: 120px;">Sector</th>
              <th style="width: 180px;" class="text-center">Firma / Huella Digital</th>
            </tr>
          </thead>
          <tbody>
    `;

    this.asignadosFiltrados.forEach((ca: any, index: number) => {
      html += `
        <tr>
          <td class="text-center">${this.filtroInicioRango + index}</td>
          <td>${ca.ciudadano?.dni}</td>
          <td>${ca.ciudadano?.nombres}</td>
          <td>${ca.ciudadano?.sector?.nombre_sector || '-'}</td>
          <td><div class="signature-box"></div></td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        <div class="footer">
          <p>Sistema de Gestión Poblacional - INTRAS | Página 1 de 1</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }
}
