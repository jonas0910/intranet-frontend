import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-contactos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contactos.component.html'
})
export class ContactosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  contactos: any[] = [];
  loading = false;
  showDetailModal = false;
  showRespondModal = false;
  selectedContact: any = null;
  respuesta = '';

  stats = { total: 0, respondidos: 0, pendientes: 0 };
  constructor(private service: GestorContenidosService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;
    this.service.getContactos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.contactos = res.data || res;
          this.calcStats();
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  calcStats(): void {
    this.stats.total = this.contactos.length;
    this.stats.respondidos = this.contactos.filter((c: any) => c.respondido).length;
    this.stats.pendientes = this.stats.total - this.stats.respondidos;
  }

  openDetail(item: any): void {
    this.selectedContact = { ...item };
    this.showDetailModal = true;
  }

  openRespond(item: any): void {
    this.selectedContact = { ...item };
    this.respuesta = '';
    this.showRespondModal = true;
  }

  marcarPendiente(item: any): void {
    if (!confirm('¿Devolver este contacto a estado Pendiente?')) return;
    this.service.marcarContactoPendiente(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => { 
        this.showDetailModal = false;
        this.loadData(); 
      });
  }

  sendResponse(): void {
    if (!this.respuesta.trim()) return;
    this.service.responderContacto(this.selectedContact.id, this.respuesta)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showRespondModal = false;
          this.loadData();
        },
        error: (err: any) => console.error('Error enviando respuesta:', err)
      });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar este contacto?')) return;
    this.service.eliminarContacto(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData());
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}
