import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-plantilla-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './plantilla-detail.component.html'
})
export class PlantillaDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  plantilla: any = null;
  paginasUsando = 0;
  loading = true;

  constructor(private service: GestorContenidosService, private route: ActivatedRoute, private router: Router, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/gestor-contenidos/plantillas']); return; }

    this.service.getPlantilla(+id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.plantilla = res?.data ?? null;
        this.paginasUsando = res?.paginas_usando ?? 0;
        if (this.plantilla) {
          if (typeof this.plantilla.componentes === 'string') {
            try { this.plantilla.componentes = JSON.parse(this.plantilla.componentes); } catch { this.plantilla.componentes = []; }
          }
          if (typeof this.plantilla.campos_personalizados === 'string') {
            try { this.plantilla.campos_personalizados = JSON.parse(this.plantilla.campos_personalizados); } catch { this.plantilla.campos_personalizados = {}; }
          }
        }
        this.loading = false;
      },
      error: () => { this.loading = false; this.router.navigate(['/gestor-contenidos/plantillas']); }
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  duplicar(): void {
    if (!this.plantilla || !confirm('¿Duplicar esta plantilla?')) return;
    this.service.duplicarPlantilla(this.plantilla.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res?.data?.id) this.router.navigate(['/gestor-contenidos/plantillas', res.data.id, 'editar']);
        else this.router.navigate(['/gestor-contenidos/plantillas']);
      }
    });
  }

  eliminar(): void {
    if (!this.plantilla || !confirm('¿Eliminar esta plantilla?')) return;
    this.service.eliminarPlantilla(this.plantilla.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) this.router.navigate(['/gestor-contenidos/plantillas']);
        else alert(res.message || 'Error al eliminar');
      },
      error: (err: any) => alert(err?.error?.message || 'Error al eliminar')
    });
  }

  getPreviewIframeUrl(): SafeResourceUrl {
    if (!this.plantilla?.id) return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    const portalUrl = (environment as any).portalUrl || 'http://localhost:8001';
    const url = `${portalUrl}/preview/plantilla/${this.plantilla.id}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getComponentes(): string[] {
    if (!this.plantilla?.componentes || !Array.isArray(this.plantilla.componentes)) return [];
    return this.plantilla.componentes;
  }

  getCamposPersonalizados(): { campo: string; tipo: string }[] {
    if (!this.plantilla?.campos_personalizados || typeof this.plantilla.campos_personalizados !== 'object') return [];
    return Object.entries(this.plantilla.campos_personalizados).map(([campo, tipo]) => ({ campo, tipo: tipo as string }));
  }

  getNivelBadge(nivel: string): string {
    const map: Record<string, string> = { basico: 'badge-success', intermedio: 'badge-info', avanzado: 'badge-warning' };
    return map[nivel] || 'badge-secondary';
  }

  getCategoriaBadge(categoria: string): string {
    const map: Record<string, string> = { basica: 'badge-success', intermedia: 'badge-info', avanzada: 'badge-warning' };
    return map[categoria] || 'badge-secondary';
  }
}
