import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inbox-user-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inbox-user-selector">
      <div class="card">
        <div class="card-header">
          <h5 class="card-title mb-0">
            <i class="fas fa-user"></i> Usuario del Buzón
          </h5>
        </div>
        <div class="card-body">
          <p class="text-muted">Selector de usuario temporal - Funcionalidad en desarrollo</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .inbox-user-selector {
      margin-bottom: 20px;
    }
    
    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }
    
    .card-title {
      color: #495057;
    }
  `]
})
export class InboxUserSelectorComponent {
  constructor() {}
}












