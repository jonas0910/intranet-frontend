import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ComunicadosService } from '../pages/comunicados/comunicados.service';
import { ComunicadoEmergenteModalComponent } from '../components/comunicado-emergente-modal/comunicado-emergente-modal.component';

const STORAGE_KEY = 'comunicados_modal_vistos';

export interface ComunicadoParaModal {
  id: number;
  titulo: string;
  contenido: string;
  tipo: string;
  prioridad: string;
  modal_duracion_segundos?: number;
  modal_mostrar_una_vez?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ComunicadosModalService {
  private showing = false;

  constructor(
    private modalService: NgbModal,
    private comunicadosService: ComunicadosService
  ) {}

  /**
   * Obtiene los IDs de comunicados modales que el usuario ya vio (mostrar una vez).
   */
  private getVistosIds(): number[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private markAsVisto(id: number): void {
    const ids = this.getVistosIds();
    if (ids.includes(id)) return;
    ids.push(id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {}
  }

  /**
   * Busca comunicados configurados como modal y los muestra uno a uno.
   * Debe llamarse cuando el usuario ya está autenticado (p. ej. desde AppComponent).
   */
  checkAndShowModales(): void {
    if (this.showing) return;
    this.showing = true;
    const vistos = this.getVistosIds();

    this.comunicadosService.getComunicadosParaModal().subscribe({
      next: (response: any) => {
        const list: ComunicadoParaModal[] = Array.isArray(response.data) ? response.data : [];
        const pendientes = list.filter((c: ComunicadoParaModal) => {
          if (c.modal_mostrar_una_vez && vistos.includes(c.id)) return false;
          return true;
        });
        this.showNext(pendientes, 0);
        this.showing = false;
      },
      error: () => {
        this.showing = false;
      }
    });
  }

  private showNext(list: ComunicadoParaModal[], index: number): void {
    if (index >= list.length) return;
    const c = list[index];
    const ref = this.modalService.open(ComunicadoEmergenteModalComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      windowClass: 'comunicado-emergente-modal'
    });
    ref.componentInstance.comunicado = c;
    ref.componentInstance.duracionSegundos = c.modal_duracion_segundos ?? 10;

    ref.result.then(
      () => {
        if (c.modal_mostrar_una_vez) this.markAsVisto(c.id);
        this.showNext(list, index + 1);
      },
      () => {
        if (c.modal_mostrar_una_vez) this.markAsVisto(c.id);
        this.showNext(list, index + 1);
      }
    );
  }
}
