import { Component, EventEmitter, Input, OnInit, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MensajeriaService } from '../../../pages/mensajeria/services/mensajeria.service';

@Component({
  selector: 'app-new-chat-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-chat-modal.component.html',
  styleUrl: './new-chat-modal.component.scss'
})
export class NewChatModalComponent implements OnInit {
  private mensajeriaService = inject(MensajeriaService);
  private cdr = inject(ChangeDetectorRef);

  @Input() visible = false;
  @Output() onClose = new EventEmitter<void>();
  @Output() onChatCreated = new EventEmitter<any>();

  contactos: any[] = [];
  busquedaContacto = '';
  contactosFiltrados: any[] = [];
  tipoNueva: 'individual' | 'group' = 'individual';
  tituloGrupo = '';
  contactosSeleccionados: any[] = [];
  cargandoContactos = false;
  creandoConv = false;

  ngOnInit(): void {
    this.cargarContactos();
  }

  cerrarModal(): void {
    this.onClose.emit();
  }

  cargarContactos(): void {
    this.cargandoContactos = true;
    this.mensajeriaService.getContactos().subscribe({
      next: (res) => {
        this.contactos = res.data || res || [];
        this.contactosFiltrados = this.contactos;
        this.cargandoContactos = false;
        this.cdr.detectChanges();
      },
      error: () => { 
        this.cargandoContactos = false; 
        this.cdr.detectChanges(); 
      }
    });
  }

  onBusquedaContacto(): void {
    const q = this.busquedaContacto.toLowerCase();
    this.contactosFiltrados = this.contactos.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }

  crearConvIndividual(contacto: any): void {
    if (this.creandoConv) return;
    this.creandoConv = true;
    this.mensajeriaService.crearConversacionIndividual(contacto.id).subscribe({
      next: (res) => {
        const conv = res.data || res;
        this.onChatCreated.emit(conv);
        this.creandoConv = false;
        this.cerrarModal();
      },
      error: () => { 
        this.creandoConv = false; 
        this.cdr.detectChanges(); 
      }
    });
  }

  crearConvGrupal(): void {
    if (!this.tituloGrupo.trim() || this.contactosSeleccionados.length < 1 || this.creandoConv) return;
    this.creandoConv = true;
    this.mensajeriaService.crearConversacionGrupal({
      title: this.tituloGrupo,
      participant_ids: this.contactosSeleccionados.map(c => c.id)
    }).subscribe({
      next: (res) => {
        const conv = res.data || res;
        this.onChatCreated.emit(conv);
        this.creandoConv = false;
        this.cerrarModal();
      },
      error: () => { 
        this.creandoConv = false; 
        this.cdr.detectChanges(); 
      }
    });
  }

  toggleContactoGrupo(c: any): void {
    const idx = this.contactosSeleccionados.findIndex(x => x.id === c.id);
    if (idx > -1) this.contactosSeleccionados.splice(idx, 1);
    else this.contactosSeleccionados.push(c);
  }

  isContactoSeleccionado(c: any): boolean {
    return this.contactosSeleccionados.some(x => x.id === c.id);
  }
}
