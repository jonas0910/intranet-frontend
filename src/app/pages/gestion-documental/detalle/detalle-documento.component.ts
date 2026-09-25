import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DocumentoService } from '../services/documento.service';
import { Documento, Version, DocumentoCompartido } from '../models/documento.model';

@Component({
  selector: 'app-detalle-documento',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <!-- Content Header (Page header) -->
  <div class="content-header">
    <div class="container-fluid">
      <div class="row mb-2">
        <div class="col-sm-6">
          <h1 class="m-0"><i class="fas fa-file-alt mr-2"></i>Detalle del Documento</h1>
        </div>
        <div class="col-sm-6">
          <ol class="breadcrumb float-sm-right">
            <li class="breadcrumb-item"><a routerLink="/">Inicio</a></li>
            <li class="breadcrumb-item"><a routerLink="/gestion-documental">Gestión Documental</a></li>
            <li class="breadcrumb-item active">Detalle</li>
          </ol>
        </div>
      </div>
    </div>
  </div>

  <!-- Main content -->
  <section class="content">
    <div class="container-fluid">
      <div class="row">
      <div class="col-md-8">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Detalle del Documento</h3></div>
          <div class="card-body" *ngIf="documento; else loadingTpl">
            <dl class="row">
              <dt class="col-sm-3">Código</dt><dd class="col-sm-9">{{documento.codigo}}</dd>
              <dt class="col-sm-3">Título</dt><dd class="col-sm-9">{{documento.titulo}}</dd>
              <dt class="col-sm-3">Tipo</dt><dd class="col-sm-9">{{documento.tipo_documento?.nombre}}</dd>
              <dt class="col-sm-3">Área</dt><dd class="col-sm-9">{{documento.area?.nombre}}</dd>
              <dt class="col-sm-3">Estado</dt><dd class="col-sm-9">{{documento.estado | titlecase}}</dd>
              <dt class="col-sm-3">Clasificación</dt><dd class="col-sm-9">{{documento.clasificacion | titlecase}}</dd>
              <dt class="col-sm-3">Fecha</dt><dd class="col-sm-9">{{documento.fecha_documento | date:'dd/MM/yyyy'}}</dd>
              <dt class="col-sm-3">Archivo</dt><dd class="col-sm-9">{{documento.nombre_archivo}} ({{documento.mime_type}})</dd>
            </dl>
            <button class="btn btn-success btn-sm" (click)="descargar()"><i class="fas fa-download mr-1"></i> Descargar</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title">Versiones</h3></div>
          <div class="card-body p-0">
            <table class="table table-sm mb-0" *ngIf="versiones && versiones.length; else noVerTpl">
              <thead><tr><th>#</th><th>Archivo</th><th>Tamaño</th><th>Creado</th></tr></thead>
              <tbody>
                <tr *ngFor="let v of versiones">
                  <td>{{v.numero_version}}</td>
                  <td>{{v.nombre_archivo}}</td>
                  <td>{{formatFileSize(v.tamano_bytes)}}</td>
                  <td>{{v.created_at | date:'dd/MM/yyyy HH:mm'}}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <i class="fas fa-users mr-2"></i>Usuarios con Acceso
            </h3>
            <span class="badge badge-info badge-pill ml-2">{{(compartidos && compartidos.length) || 0}}</span>
          </div>
          <div class="card-body p-0">
            <div *ngIf="compartidos && compartidos.length; else noCompartidosTpl">
              <!-- Información sobre el estado -->
              <div class="alert alert-light m-3 mb-2">
                <small>
                  <i class="fas fa-info-circle text-info mr-1"></i>
                  <strong>Estado de Lectura:</strong> 
                  <span class="badge badge-success badge-sm ml-1">✅ Leído</span> = El usuario ya accedió al documento. 
                  <span class="badge badge-secondary badge-sm ml-1">⏱️ Pendiente</span> = El usuario aún no ha abierto el documento.
                </small>
              </div>
              
              <table class="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Permiso</th>
                    <th>Compartido Por</th>
                    <th>Fecha Compartido</th>
                    <th>Estado de Lectura</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let comp of compartidos">
                    <td>
                      <i class="fas fa-user text-muted mr-1"></i>
                      {{comp.usuario.nombre}}
                    </td>
                    <td><small>{{comp.usuario.email}}</small></td>
                    <td>
                      <span *ngIf="comp.permiso === 'solo-lectura'" class="badge badge-info">
                        <i class="fas fa-eye"></i> Solo Lectura
                      </span>
                      <span *ngIf="comp.permiso === 'lectura-descarga'" class="badge badge-primary">
                        <i class="fas fa-download"></i> Lectura + Descarga
                      </span>
                      <span *ngIf="comp.permiso === 'comentar'" class="badge badge-info">
                        <i class="fas fa-comment"></i> Comentar
                      </span>
                      <span *ngIf="comp.permiso === 'edicion'" class="badge badge-warning">
                        <i class="fas fa-edit"></i> Edición
                      </span>
                      <span *ngIf="comp.permiso === 'edicion-completa'" class="badge badge-warning">
                        <i class="fas fa-file-alt"></i> Edición Completa
                      </span>
                      <span *ngIf="comp.permiso === 'administrar'" class="badge badge-danger">
                        <i class="fas fa-user-shield"></i> Administrar
                      </span>
                    </td>
                    <td><small>{{comp.compartido_por.nombre}}</small></td>
                    <td><small>{{comp.compartido_en | date:'dd/MM/yyyy HH:mm'}}</small></td>
                    <td>
                      <span *ngIf="comp.leido_en" class="badge badge-success badge-sm" 
                            [title]="'Leído el ' + (comp.leido_en | date:'dd/MM/yyyy HH:mm')">
                        <i class="fas fa-check-circle"></i> Leído
                      </span>
                      <span *ngIf="!comp.leido_en" class="badge badge-warning badge-sm" 
                            title="El usuario aún no ha accedido a este documento">
                        <i class="fas fa-clock"></i> Pendiente de Lectura
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <!-- Alerta de Bloqueo -->
        <div *ngIf="documento?.bloqueado && documento?.cierre_id" class="alert alert-warning">
          <h5><i class="fas fa-lock mr-2"></i>Bloqueado por Cierre</h5>
          <p class="mb-0">Este documento está bloqueado porque pertenece a un cierre de periodo aprobado.</p>
          <small class="text-muted">No puede ser editado ni eliminado.</small>
        </div>
        <div *ngIf="documento?.bloqueado && !documento?.cierre_id" class="alert alert-danger">
          <h5><i class="fas fa-lock mr-2"></i>Bloqueado Manualmente</h5>
          <p class="mb-0">Este documento fue bloqueado manualmente para protegerlo.</p>
          <small class="text-muted">Puede desbloquearse desde la bandeja de documentos.</small>
        </div>

        <!-- Stats Card -->
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h3 class="card-title"><i class="fas fa-chart-bar mr-2"></i>Estadísticas</h3>
          </div>
          <div class="card-body">
            <div class="info-box bg-light mb-2">
              <span class="info-box-icon bg-info"><i class="fas fa-eye"></i></span>
              <div class="info-box-content">
                <span class="info-box-text">Accesos</span>
                <span class="info-box-number">{{documento?.numero_accesos || 0}}</span>
              </div>
            </div>
            <div class="info-box bg-light mb-2">
              <span class="info-box-icon bg-warning"><i class="fas fa-code-branch"></i></span>
              <div class="info-box-content">
                <span class="info-box-text">Versiones</span>
                <span class="info-box-number">{{(versiones && versiones.length) || 0}}</span>
              </div>
            </div>
            <div class="info-box bg-light mb-0">
              <span class="info-box-icon bg-success"><i class="fas fa-users"></i></span>
              <div class="info-box-content">
                <span class="info-box-text">Compartidos</span>
                <span class="info-box-number">{{(compartidos && compartidos.length) || 0}}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones -->
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i class="fas fa-bolt mr-2"></i>Acciones</h3></div>
          <div class="card-body">
            <button class="btn btn-outline-primary btn-block mb-2" [routerLink]="['/gestion-documental/lista']">
              <i class="fas fa-arrow-left mr-2"></i>Volver a la Lista
            </button>
            <button class="btn btn-primary btn-block mb-2" [routerLink]="['/gestion-documental/cargar']">
              <i class="fas fa-plus mr-2"></i>Nuevo Documento
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  </section>

  <ng-template #loadingTpl>
    <div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i></div>
  </ng-template>
  <ng-template #noVerTpl>
    <div class="p-3 text-muted">No hay versiones</div>
  </ng-template>
  <ng-template #noCompartidosTpl>
    <div class="p-3 text-center text-muted">
      <i class="fas fa-user-slash fa-2x mb-2"></i>
      <p class="mb-0">Este documento no ha sido compartido con ningún usuario</p>
    </div>
  </ng-template>
  `
})
export class DetalleDocumentoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  documento: Documento | null = null;
  versiones: Version[] = [];
  compartidos: DocumentoCompartido[] = [];

  constructor(private route: ActivatedRoute, private documentoService: DocumentoService) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.documentoService.obtener(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: resp => { if (resp.success) this.documento = resp.data!; }, error: err => console.error(err) });
      this.documentoService.listarVersiones(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: resp => { if (resp.success) this.versiones = resp.data || []; }, error: err => console.error(err) });
      this.documentoService.obtenerCompartidos(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({ 
          next: resp => { 
            if (resp.success) this.compartidos = resp.data || []; 
          }, 
          error: err => console.error('Error al cargar compartidos:', err) 
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  descargar(): void {
    if (!this.documento) return;
    this.documentoService.descargar(this.documento.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.documento!.nombre_archivo;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      });
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 Bytes';
    const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}


