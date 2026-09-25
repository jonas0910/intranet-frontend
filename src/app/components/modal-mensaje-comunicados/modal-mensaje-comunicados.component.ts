import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalMensaje } from '../../services/comunicados-institucional.service';

@Component({
  selector: 'app-modal-mensaje-comunicados',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-mensaje-comunicados.component.html',
  styleUrls: ['./modal-mensaje-comunicados.component.scss'],
})
export class ModalMensajeComunicadosComponent implements OnInit {
  @Input() modales: ModalMensaje[] = [];
  @Input() modalActual: ModalMensaje | null = null;
  @Input() indiceActual = 0;
  @Output() cerrar = new EventEmitter<void>();
  @Output() siguiente = new EventEmitter<void>();
  @Output() marcarVisto = new EventEmitter<number>();

  ngOnInit(): void {}

  onCerrar(): void {
    if (this.modalActual?.mostrar_una_vez) {
      this.marcarVisto.emit(this.modalActual.id);
    }
    this.cerrar.emit();
  }

  onSiguiente(): void {
    if (this.modalActual?.mostrar_una_vez) {
      this.marcarVisto.emit(this.modalActual.id);
    }
    this.siguiente.emit();
  }
}
