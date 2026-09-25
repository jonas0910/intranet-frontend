import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './citas.component.html',
  styleUrls: ['./citas.component.scss']
})
export class CitasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  citas: any[] = [];
  loading = false;
  activeTab: 'listado' | 'calendario' = 'listado';
  showModal = false;
  showEmailModal = false;
  showDetailModal = false;
  editing = false;
  form: any = {};
  filtroEstado = '';
  selectedCita: any = null;
  emailForm = { asunto: '', mensaje: '' };
  sendingEmail = false;
  emailSuccess = '';
  emailError = '';

  // Calendario
  calMonth = new Date().getMonth();
  calYear = new Date().getFullYear();
  calDays: { date: Date; citas: any[]; isCurrentMonth: boolean }[] = [];

  tiposCita = ['consulta', 'tramite', 'audiencia', 'otro'];
  estadosCita = ['pendiente', 'confirmada', 'cancelada', 'completada'];
  meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

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
    const filtros: any = {};
    if (this.filtroEstado) filtros.estado = this.filtroEstado;
    this.service.getCitas(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.citas = res.data || res;
          this.buildCalendar();
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  buildCalendar(): void {
    const first = new Date(this.calYear, this.calMonth, 1);
    const last = new Date(this.calYear, this.calMonth + 1, 0);
    const startPad = first.getDay();
    const startDate = new Date(first);
    startDate.setDate(startDate.getDate() - startPad);
    this.calDays = [];
    const totalCells = Math.ceil((last.getDate() + startPad) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const citasDelDia = this.citas.filter((c: any) => {
        const fd = new Date(c.fecha_inicio);
        return fd.getDate() === d.getDate() && fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear();
      });
      this.calDays.push({
        date: new Date(d),
        citas: citasDelDia,
        isCurrentMonth: d.getMonth() === this.calMonth
      });
    }
  }

  prevMonth(): void {
    if (this.calMonth === 0) { this.calMonth = 11; this.calYear--; } else { this.calMonth--; }
    this.buildCalendar();
  }

  nextMonth(): void {
    if (this.calMonth === 11) { this.calMonth = 0; this.calYear++; } else { this.calMonth++; }
    this.buildCalendar();
  }

  openCreate(): void {
    this.editing = false;
    this.form = {
      tipo: 'consulta',
      estado: 'pendiente',
      fecha_inicio: new Date().toISOString().slice(0, 16),
      fecha_fin: new Date(Date.now() + 3600000).toISOString().slice(0, 16)
    };
    this.showModal = true;
  }

  openEdit(item: any): void {
    this.editing = true;
    this.form = { ...item };
    if (this.form.fecha_inicio) this.form.fecha_inicio = this.form.fecha_inicio.substring(0, 16);
    if (this.form.fecha_fin) this.form.fecha_fin = this.form.fecha_fin?.substring(0, 16);
    this.showModal = true;
  }

  openDetail(item: any): void {
    this.selectedCita = item;
    this.showDetailModal = true;
  }

  openEmailModal(item: any): void {
    this.selectedCita = item;
    this.emailForm = {
      asunto: `Respuesta a su cita: ${item.titulo}`,
      mensaje: `Estimado/a ${item.cliente_nombre},\n\nEn relación a su cita programada para el ${this.formatDate(item.fecha_inicio)}, le informamos que...\n\nAtentamente,\nNotaria`
    };
    this.emailSuccess = '';
    this.emailError = '';
    this.showEmailModal = true;
  }

  sendEmail(): void {
    if (!this.selectedCita || !this.emailForm.asunto.trim() || !this.emailForm.mensaje.trim()) return;
    this.sendingEmail = true;
    this.emailSuccess = '';
    this.emailError = '';
    this.service.enviarEmailCita(this.selectedCita.id, this.emailForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.sendingEmail = false;
          this.emailSuccess = res.message || 'Correo enviado correctamente';
          setTimeout(() => { this.showEmailModal = false; }, 1500);
        },
        error: (err: any) => {
          this.sendingEmail = false;
          this.emailError = err.error?.message || 'Error al enviar el correo';
        }
      });
  }

  save(): void {
    const obs = this.editing
      ? this.service.actualizarCita(this.form.id, this.form)
      : this.service.crearCita(this.form);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showModal = false; this.loadData(); },
      error: (err: any) => console.error('Error guardando cita:', err)
    });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar esta cita?')) return;
    this.service.eliminarCita(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData());
  }

  cambiarEstado(item: any, nuevoEstado: string): void {
    this.service.actualizarCita(item.id, { ...item, estado: nuevoEstado })
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData());
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  aplicarFiltro(): void {
    this.loadData();
  }

  get citasProximas(): any[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return this.citas
      .filter((c: any) => new Date(c.fecha_inicio) >= hoy && c.estado !== 'cancelada')
      .sort((a: any, b: any) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
      .slice(0, 10);
  }
}
