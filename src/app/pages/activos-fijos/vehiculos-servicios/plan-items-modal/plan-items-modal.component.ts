import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PlanItemMantenimiento } from '../../services/vehiculo-servicio.service';

@Component({
  selector: 'app-plan-items-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plan-items-modal.component.html',
  styleUrls: ['./plan-items-modal.component.scss']
})
export class PlanItemsModalComponent {
  tituloResumen = '';
  soloLectura = false;

  items: PlanItemMantenimiento[] = [];

  constructor(public activeModal: NgbActiveModal) {}

  /** Llamar justo después de `modal.open()` para cargar datos antes del primer render. */
  cargar(titulo: string, items: PlanItemMantenimiento[], soloLectura: boolean): void {
    this.tituloResumen = titulo;
    this.soloLectura = soloLectura;
    this.items = (items || []).map((i) => ({
      tipo_item: i.tipo_item === 'elemento_cambio' ? 'elemento_cambio' : 'actividad',
      descripcion: i.descripcion ?? '',
      cantidad: i.cantidad ?? null,
      unidad: i.unidad ?? null
    }));
  }

  agregarFila(): void {
    this.items.push({
      tipo_item: 'actividad',
      descripcion: '',
      cantidad: null,
      unidad: null
    });
  }

  quitarFila(index: number): void {
    this.items.splice(index, 1);
  }

  guardar(): void {
    this.activeModal.close(this.items);
  }

  cerrar(): void {
    this.activeModal.dismiss();
  }
}
