import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DesignSystemComponent } from './design-system/design-system.component';

@Component({
  selector: 'app-patrones',
  standalone: true,
  imports: [CommonModule, DesignSystemComponent],
  templateUrl: './patrones.component.html',
  styleUrls: ['./patrones.component.css']
})
export class PatronesComponent {}
