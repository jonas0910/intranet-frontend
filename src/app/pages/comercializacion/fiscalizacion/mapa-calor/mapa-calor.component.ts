import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mapa-calor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapa-calor.component.html',
  styleUrl: './mapa-calor.component.css'
})
export class MapaCalorComponent {
  viewConfig: any = {
    title: 'Mapa de Calor - Puntos Críticos',
    icon: 'fas fa-map-marked-alt',
  };
}
