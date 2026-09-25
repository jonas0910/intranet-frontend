import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { TicketsService } from '../services/tickets.service';
import { DesignSystemService } from '../../../services/design-system.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SystemLayoutComponent],
  templateUrl: './ticket-create.component.html',
})
export class TicketCreateComponent {
  model = { titulo: '', descripcion: '', prioridad: 'media', categoria: 'General' };
  loading = false;

  constructor(
    private ticketsService: TicketsService,
    private designSystem: DesignSystemService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.designSystem.setActiveSubsystem('helpdesk');
  }

  enviar(): void {
    if (!this.model.titulo?.trim() || !this.model.descripcion?.trim()) {
      this.toast.error('Título y descripción son obligatorios');
      return;
    }
    this.loading = true;
    this.ticketsService.createTicket(this.model).subscribe({
      next: (res) => {
        this.toast.success('Ticket creado correctamente');
        this.router.navigate(['/helpdesk/tickets', res.data?.id]);
        this.loading = false;
      },
      error: (err) => {
        this.toast.error(err?.message || 'Error al crear el ticket');
        this.loading = false;
      },
    });
  }
}
