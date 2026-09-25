import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';
import { getStorageUrl } from '../utils/storage-url.util';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-plantillas',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './plantillas.component.html',
  styles: [`
    .plantilla-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
    .plantilla-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
    .plantilla-preview-iframe { width: 100%; height: 450px; border: 0; display: block; }
    .nav-tabs .nav-link.active { font-weight: 600; }
    .table td { vertical-align: middle !important; }
  `]
})
export class PlantillasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  plantillasAll: any[] = [];
  loading = true;
  activeTab = 'todas';
  estadisticas: any = { total: 0, basicas: 0, intermedias: 0, avanzadas: 0, activas: 0 };

  constructor(private service: GestorContenidosService, private sanitizer: DomSanitizer) {}

  ngOnInit(): void { this.cargar(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  cargar(): void {
    this.loading = true;
    this.service.getPlantillas().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.plantillasAll = res?.data ?? [];
        this.estadisticas = res?.estadisticas ?? {
          total: this.plantillasAll.length,
          basicas: this.plantillasAll.filter((p: any) => p.categoria === 'basica').length,
          intermedias: this.plantillasAll.filter((p: any) => p.categoria === 'intermedia').length,
          avanzadas: this.plantillasAll.filter((p: any) => p.categoria === 'avanzada').length,
          activas: this.plantillasAll.filter((p: any) => p.activa).length,
        };
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get filteredPlantillas(): any[] {
    if (this.activeTab === 'todas') return this.plantillasAll;
    return this.plantillasAll.filter(p => p.categoria === this.activeTab);
  }

  setTab(tab: string): void { this.activeTab = tab; }

  duplicar(id: number): void {
    if (!confirm('¿Duplicar esta plantilla?')) return;
    this.service.duplicarPlantilla(id).pipe(takeUntil(this.destroy$)).subscribe({ next: () => this.cargar() });
  }

  eliminar(id: number): void {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    this.service.eliminarPlantilla(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) this.cargar();
        else alert(res.message || 'Error al eliminar');
      },
      error: (err: any) => alert(err?.error?.message || 'Error al eliminar')
    });
  }

  getNivelBadge(nivel: string): string {
    const map: Record<string, string> = { basico: 'badge-success', intermedio: 'badge-info', avanzado: 'badge-warning' };
    return map[nivel] || 'badge-secondary';
  }

  getCategoriaBadge(categoria: string): string {
    const map: Record<string, string> = { basica: 'badge-success', intermedia: 'badge-info', avanzada: 'badge-warning', especial: 'badge-dark' };
    return map[categoria] || 'badge-secondary';
  }

  getPreviewUrl(p: any): string {
    if (!p.preview_imagen) return '';
    return getStorageUrl(p.preview_imagen);
  }

  getPreviewIframeUrl(p: any): SafeResourceUrl {
    const portalUrl = (environment as any).portalUrl || 'http://localhost:8001';
    const url = `${portalUrl}/preview/plantilla/${p.id}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getComponentes(p: any): string[] {
    if (!p.componentes || !Array.isArray(p.componentes)) return [];
    return p.componentes;
  }
}
