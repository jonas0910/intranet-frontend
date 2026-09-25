import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TramiteService } from '../../services/documento.service';
import { DataTablesModule } from '../../../../lib/angular-datatables/angular-datatables.module';
import { DataTableDirective } from '../../../../lib/angular-datatables/angular-datatables.directive';

@Component({
  selector: 'app-tipos-tramite',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DataTablesModule],
  templateUrl: './tipos-tramite.component.html',
  styleUrl: './tipos-tramite.component.scss'
})
export class TiposTramiteComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;
  private destroy$ = new Subject<void>();
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  tipos: any[] = [];
  areas: any[] = [];
  loading = true;
  showModal = false;
  editando = false;
  processing = false;

  form: any = {
    id: null, nombre: '', codigo: '', descripcion: '', requisitos: '',
    plazo_dias: 30, costo: 0, area_id: '', orden: 0,
    requiere_documentos: true, permite_seguimiento_online: true, activo: true,
    es_tupa: false, codigo_tupa: ''
  };

  constructor(private tramiteService: TramiteService) {}

  ngOnInit(): void {
    this.dtOptions = {
      pageLength: 25,
      order: [[0, 'asc']],
      responsive: true,
      language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' },
      columnDefs: [{ orderable: false, targets: 7 }]
    };
    this.tramiteService.getCatalogos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.areas = res.data.areas || []; }
    });
    this.cargar();
  }

  ngAfterViewInit(): void { setTimeout(() => this.safeDtTriggerNext(), 200); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private safeDtTriggerNext(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
  }

  cargar(): void {
    this.loading = true;
    this.tramiteService.getTipos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.tipos = res.data || []; this.loading = false; this.rerender(); },
      error: () => this.loading = false
    });
  }

  rerender(): void {
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dt: any) => { dt.destroy(); this.safeDtTriggerNext(); });
    }
  }

  abrirNuevo(): void {
    this.editando = false;
    this.form = {
      id: null, nombre: '', codigo: '', descripcion: '', requisitos: '',
      plazo_dias: 30, costo: 0, area_id: '', orden: 0,
      requiere_documentos: true, permite_seguimiento_online: true, activo: true,
      es_tupa: false, codigo_tupa: ''
    };
    this.showModal = true;
  }


  abrirEditar(tipo: any): void {
    this.editando = true;
    this.form = {
      ...tipo,
      area_id: tipo.area_id ?? '',
      requiere_documentos: !!tipo.requiere_documentos,
      permite_seguimiento_online: tipo.permite_seguimiento_online !== false,
      activo: tipo.activo !== false,
      es_tupa: !!tipo.es_tupa,
      codigo_tupa: tipo.codigo_tupa || '',
      costo: tipo.costo ?? 0,
      requisitos: tipo.requisitos || ''
    };
    this.showModal = true;
  }

  guardar(): void {
    if (!this.form.nombre || !this.form.codigo) return;
    const payload: any = { ...this.form };
    payload.area_id = payload.area_id || null;
    if (!this.editando) delete payload.orden; // backend usará maxOrden+1 al crear
    this.processing = true;
    const obs = this.editando
      ? this.tramiteService.actualizarTipo(this.form.id, payload)
      : this.tramiteService.crearTipo(payload);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) { this.showModal = false; this.cargar(); } this.processing = false; },
      error: (err) => {
        this.processing = false;
        const msg = err?.error?.message || err?.message || 'Error al guardar';
        alert(msg);
      }
    });
  }

  eliminar(id: number): void {
    if (!confirm('¿Eliminar este tipo de trámite?')) return;
    this.tramiteService.eliminarTipo(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.cargar(); }
    });
  }
}
